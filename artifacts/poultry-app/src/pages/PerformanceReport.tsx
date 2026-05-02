import { useParams, Link } from "wouter";
import {
  useGetHousePerformanceReport,
  getGetHousePerformanceReportQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  Legend,
} from "recharts";

type TrendIndicator = "improving" | "neutral" | "declining" | "insufficient_data";

function TrendBadge({ trend, label }: { trend: TrendIndicator; label: string }) {
  if (trend === "improving")
    return (
      <span className="flex items-center gap-1 text-green-600 font-semibold text-sm">
        <TrendingUp className="h-4 w-4" />
        {label} · تحسّن
      </span>
    );
  if (trend === "declining")
    return (
      <span className="flex items-center gap-1 text-red-600 font-semibold text-sm">
        <TrendingDown className="h-4 w-4" />
        {label} · تراجع
      </span>
    );
  if (trend === "neutral")
    return (
      <span className="flex items-center gap-1 text-amber-600 font-semibold text-sm">
        <Minus className="h-4 w-4" />
        {label} · مستقر
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-sm">
      <AlertCircle className="h-4 w-4" />
      {label} · بيانات غير كافية
    </span>
  );
}

function MetricCard({
  label,
  current,
  historical,
  trend,
  unit = "",
  lowerIsBetter = false,
  precision = 2,
}: {
  label: string;
  current?: number | null;
  historical?: number | null;
  trend: TrendIndicator;
  unit?: string;
  lowerIsBetter?: boolean;
  precision?: number;
}) {
  const hasCurrent = current != null;
  const hasHistorical = historical != null && historical > 0;

  const diff =
    hasCurrent && hasHistorical ? ((current! - historical!) / historical!) * 100 : null;

  const goodDiff = lowerIsBetter ? diff != null && diff < 0 : diff != null && diff > 0;
  const badDiff = lowerIsBetter ? diff != null && diff > 0 : diff != null && diff < 0;

  const trendColor =
    trend === "improving"
      ? "border-t-green-500"
      : trend === "declining"
        ? "border-t-red-500"
        : trend === "neutral"
          ? "border-t-amber-400"
          : "border-t-muted";

  return (
    <Card className={`border-t-4 ${trendColor}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-muted-foreground mb-1">الدورة الحالية</p>
            <p className="text-3xl font-bold">
              {hasCurrent ? `${current!.toFixed(precision)}${unit}` : "—"}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground mb-1">المتوسط التاريخي</p>
            <p className="text-lg font-semibold text-muted-foreground">
              {hasHistorical ? `${historical!.toFixed(precision)}${unit}` : "—"}
            </p>
          </div>
        </div>

        {diff != null && (
          <div
            className={`text-sm font-semibold flex items-center gap-1 ${goodDiff ? "text-green-600" : badDiff ? "text-red-600" : "text-amber-600"}`}
          >
            {goodDiff ? <TrendingUp className="h-4 w-4" /> : badDiff ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            {diff > 0 ? "+" : ""}{diff.toFixed(1)}% مقارنةً بالمتوسط
          </div>
        )}

        <div className="pt-1">
          <TrendBadge trend={trend} label="" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerformanceReport() {
  const params = useParams();
  const farmId = parseInt(params.farmId || "0", 10);
  const houseId = parseInt(params.houseId || "0", 10);

  const { data: report, isLoading } = useGetHousePerformanceReport(houseId, {
    query: { enabled: !!houseId, queryKey: getGetHousePerformanceReportQueryKey(houseId) },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-3 opacity-40" />
        <p>لم يتم العثور على بيانات هذا العنبر</p>
      </div>
    );
  }

  const { activeCycle, historicalAvg, trends, cycleHistory } = report;

  // Chart data — all cycles for comparison charts
  const chartHistory = cycleHistory.map((c) => ({
    name: `د${c.cycleNumber}`,
    cycleNumber: c.cycleNumber,
    fcr: c.fcr,
    mortalityRate: c.mortalityRate,
    netProfit: c.netProfit,
    costPerLiveKg: c.costPerLiveKg,
    isCurrent: c.status === "active",
  }));

  const hasActiveCycle = !!activeCycle;
  const hasEnoughHistory = historicalAvg.cycleCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/farms/${farmId}/houses/${houseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowRight className="h-6 w-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            تقرير الأداء
          </h1>
          <p className="text-muted-foreground mt-1">{report.houseNameAr}</p>
        </div>
      </div>

      {/* Status Banner */}
      {hasActiveCycle ? (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-5 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Clock className="h-5 w-5" />
              <span>دورة نشطة — رقم {activeCycle!.cycleNumber}</span>
            </div>
            <div className="text-muted-foreground text-sm">
              اليوم <span className="font-bold text-foreground">{activeCycle!.daysElapsed}</span> من الدورة
            </div>
            <div className="text-muted-foreground text-sm">
              الكتاكيت: <span className="font-bold text-foreground">{activeCycle!.chickCount.toLocaleString()}</span>
            </div>
            <div className="text-muted-foreground text-sm">
              النفوق المسجّل:{" "}
              <span className="font-bold text-destructive">
                {(activeCycle!.currentMortality ?? 0).toLocaleString()} طائر
              </span>
            </div>
            <div className="text-muted-foreground text-sm">
              التكلفة حتى الآن:{" "}
              <span className="font-bold text-foreground">
                {activeCycle!.totalCostSoFar?.toLocaleString()} ج.م
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-5 flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>لا توجد دورة نشطة حالياً — يعرض التقرير المتوسطات التاريخية فقط</span>
          </CardContent>
        </Card>
      )}

      {/* Historical Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
        <span>
          المتوسطات التاريخية محسوبة من{" "}
          <span className="font-bold text-foreground">{historicalAvg.cycleCount}</span>{" "}
          دورة{historicalAvg.cycleCount !== 1 ? " مكتملة" : " مكتملة"} سابقة
          {historicalAvg.avgDaysToSale > 0 && (
            <> · متوسط عمر البيع: <span className="font-bold text-foreground">{historicalAvg.avgDaysToSale}</span> يوم</>
          )}
          {historicalAvg.avgChickCount > 0 && (
            <> · متوسط حجم الدفعة: <span className="font-bold text-foreground">{historicalAvg.avgChickCount.toLocaleString()}</span> طائر</>
          )}
        </span>
      </div>

      {/* KPI Comparison Cards */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          مقارنة المؤشرات الرئيسية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="معامل التحويل (FCR)"
            current={activeCycle?.estimatedFcr}
            historical={hasEnoughHistory ? historicalAvg.avgFcr : null}
            trend={trends.fcr as TrendIndicator}
            lowerIsBetter
            precision={3}
          />
          <MetricCard
            label="نسبة النفوق"
            current={activeCycle?.mortalityRate}
            historical={hasEnoughHistory ? historicalAvg.avgMortalityRate : null}
            trend={trends.mortalityRate as TrendIndicator}
            unit="%"
            lowerIsBetter
          />
          <MetricCard
            label="تكلفة الكيلو الحي"
            current={activeCycle?.costPerLiveKgSoFar}
            historical={hasEnoughHistory ? historicalAvg.avgCostPerLiveKg : null}
            trend={trends.costPerLiveKg as TrendIndicator}
            unit=" ج.م"
            lowerIsBetter
          />
        </div>
      </div>

      {/* Historical Averages reference row */}
      {hasEnoughHistory && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">المتوسطات التاريخية المرجعية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground">متوسط FCR</p>
                <p className="text-2xl font-bold">{historicalAvg.avgFcr.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">متوسط النفوق</p>
                <p className="text-2xl font-bold">{historicalAvg.avgMortalityRate.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">متوسط صافي الربح</p>
                <p className="text-2xl font-bold text-primary">
                  {historicalAvg.avgNetProfit > 0
                    ? `${historicalAvg.avgNetProfit.toLocaleString()} ج.م`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">متوسط تكلفة الكيلو</p>
                <p className="text-2xl font-bold">
                  {historicalAvg.avgCostPerLiveKg > 0
                    ? `${historicalAvg.avgCostPerLiveKg.toFixed(2)} ج.م`
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts section */}
      {chartHistory.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            تطور الأداء عبر الدورات
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FCR trend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">معامل التحويل (FCR) — أقل أفضل</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [v?.toFixed(3), "FCR"]} />
                    {historicalAvg.avgFcr > 0 && (
                      <ReferenceLine
                        y={historicalAvg.avgFcr}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        label={{ value: "متوسط", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="fcr"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2.5}
                      dot={{ r: 5, strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Mortality rate trend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">نسبة النفوق — أقل أفضل</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} unit="%" />
                    <Tooltip formatter={(v: number) => [`${v?.toFixed(2)}%`, "نسبة النفوق"]} />
                    {historicalAvg.avgMortalityRate > 0 && (
                      <ReferenceLine
                        y={historicalAvg.avgMortalityRate}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        label={{ value: "متوسط", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="mortalityRate"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2.5}
                      dot={{ r: 5, strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Net profit bar chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">صافي الربح لكل دورة</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v?.toLocaleString()} ج.م`, "صافي الربح"]}
                    />
                    {historicalAvg.avgNetProfit > 0 && (
                      <ReferenceLine
                        y={historicalAvg.avgNetProfit}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        label={{ value: "متوسط", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                    )}
                    <Bar
                      dataKey="netProfit"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost per live kg */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">تكلفة الكيلو الحي — أقل أفضل</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} unit=" ج.م" />
                    <Tooltip formatter={(v: number) => [`${v?.toFixed(2)} ج.م`, "تكلفة الكيلو"]} />
                    {historicalAvg.avgCostPerLiveKg > 0 && (
                      <ReferenceLine
                        y={historicalAvg.avgCostPerLiveKg}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        label={{ value: "متوسط", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="costPerLiveKg"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2.5}
                      dot={{ r: 5, strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Cycle History Table */}
      {cycleHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">جدول سجل الدورات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-right p-3 font-medium">الدورة</th>
                    <th className="text-right p-3 font-medium">تاريخ التسكين</th>
                    <th className="text-right p-3 font-medium">الحالة</th>
                    <th className="text-right p-3 font-medium">FCR</th>
                    <th className="text-right p-3 font-medium">نسبة النفوق</th>
                    <th className="text-right p-3 font-medium">تكلفة الكيلو</th>
                    <th className="text-right p-3 font-medium">صافي الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {[...cycleHistory].reverse().map((c) => (
                    <tr
                      key={c.cycleNumber}
                      className={`border-t transition-colors ${c.status === "active" ? "bg-primary/5 font-semibold" : "hover:bg-muted/30"}`}
                    >
                      <td className="p-3">
                        <span className="flex items-center gap-2">
                          #{c.cycleNumber}
                          {c.status === "active" && (
                            <Badge className="text-xs py-0">نشطة</Badge>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(c.housingDate).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-3">
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>
                          {c.status === "active" ? "نشطة" : "مكتملة"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {c.fcr != null ? (
                          <span
                            className={`font-bold ${c.fcr < 1.8 ? "text-green-600" : c.fcr > 2.2 ? "text-red-600" : "text-amber-600"}`}
                          >
                            {c.fcr.toFixed(3)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        {c.mortalityRate != null ? (
                          <span
                            className={`font-bold ${c.mortalityRate < 5 ? "text-green-600" : c.mortalityRate > 10 ? "text-red-600" : "text-amber-600"}`}
                          >
                            {c.mortalityRate.toFixed(2)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        {c.costPerLiveKg != null ? `${c.costPerLiveKg.toFixed(2)} ج.م` : "—"}
                      </td>
                      <td className="p-3 font-bold text-primary">
                        {c.netProfit != null ? `${c.netProfit.toLocaleString()} ج.م` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {hasEnoughHistory && (
                  <tfoot className="bg-muted/30 border-t-2">
                    <tr>
                      <td colSpan={3} className="p-3 font-bold text-muted-foreground">
                        المتوسط التاريخي
                      </td>
                      <td className="p-3 font-bold">
                        {historicalAvg.avgFcr > 0 ? historicalAvg.avgFcr.toFixed(3) : "—"}
                      </td>
                      <td className="p-3 font-bold">
                        {historicalAvg.avgMortalityRate > 0
                          ? `${historicalAvg.avgMortalityRate.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="p-3 font-bold">
                        {historicalAvg.avgCostPerLiveKg > 0
                          ? `${historicalAvg.avgCostPerLiveKg.toFixed(2)} ج.م`
                          : "—"}
                      </td>
                      <td className="p-3 font-bold text-primary">
                        {historicalAvg.avgNetProfit > 0
                          ? `${historicalAvg.avgNetProfit.toLocaleString()} ج.م`
                          : "—"}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
