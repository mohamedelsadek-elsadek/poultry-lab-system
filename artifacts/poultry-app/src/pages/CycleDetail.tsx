import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetCycle,
  useDeleteCycle,
  getGetCycleQueryKey,
  useListMortalityLogs,
  useAddMortalityLog,
  useDeleteMortalityLog,
  getListMortalityLogsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  FileEdit,
  Trash2,
  AlertTriangle,
  Coins,
  Activity,
  Plus,
  X,
  HeartPulse,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

export default function CycleDetail() {
  const params = useParams();
  const cycleId = parseInt(params.cycleId || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logCount, setLogCount] = useState("");
  const [logNotes, setLogNotes] = useState("");

  const { data: cycle, isLoading } = useGetCycle(cycleId, {
    query: { enabled: !!cycleId, queryKey: getGetCycleQueryKey(cycleId) },
  });
  const { data: mortalityLogs, isLoading: logsLoading } = useListMortalityLogs(cycleId, {
    query: { enabled: !!cycleId, queryKey: getListMortalityLogsQueryKey(cycleId) },
  });

  const deleteCycleMutation = useDeleteCycle();
  const addLogMutation = useAddMortalityLog();
  const deleteLogMutation = useDeleteMortalityLog();

  if (isLoading || !cycle) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const handleDeleteCycle = () => {
    deleteCycleMutation.mutate(
      { cycleId },
      {
        onSuccess: () => {
          toast({ title: "تم الحذف", description: "تم حذف الدورة بنجاح" });
          setLocation("/farms");
        },
        onError: () => {
          toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء الحذف" });
        },
      },
    );
  };

  const handleAddLog = () => {
    const count = parseInt(logCount, 10);
    if (!logDate || isNaN(count) || count < 1) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى إدخال التاريخ والعدد بشكل صحيح" });
      return;
    }
    addLogMutation.mutate(
      { cycleId, data: { logDate, count, notes: logNotes || undefined } },
      {
        onSuccess: () => {
          toast({ title: "تم التسجيل", description: "تم تسجيل النفوق بنجاح" });
          queryClient.invalidateQueries({ queryKey: getListMortalityLogsQueryKey(cycleId) });
          setLogCount("");
          setLogNotes("");
        },
        onError: () => {
          toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء التسجيل" });
        },
      },
    );
  };

  const handleDeleteLog = (logId: number) => {
    deleteLogMutation.mutate(
      { cycleId, logId },
      {
        onSuccess: () => {
          toast({ title: "تم الحذف", description: "تم حذف السجل" });
          queryClient.invalidateQueries({ queryKey: getListMortalityLogsQueryKey(cycleId) });
        },
        onError: () => {
          toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ" });
        },
      },
    );
  };

  const housingDate = new Date(cycle.housingDate);
  const chartData = (mortalityLogs ?? []).map((log) => {
    const date = new Date(log.logDate);
    const dayNum = Math.floor((date.getTime() - housingDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return {
      day: `يوم ${dayNum}`,
      date: log.logDate,
      count: log.count,
    };
  });

  const totalFromLogs = (mortalityLogs ?? []).reduce((sum, l) => sum + l.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowRight className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              دورة رقم {cycle.cycleNumber}
              <Badge
                variant={cycle.status === "active" ? "default" : "secondary"}
                className="text-sm"
              >
                {cycle.status === "active" ? "نشطة" : "مكتملة"}
              </Badge>
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/cycles/${cycleId}/edit`}>
            <Button variant="outline" className="gap-2">
              <FileEdit className="h-4 w-4" />
              تعديل
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد من حذف هذه الدورة؟</AlertDialogTitle>
                <AlertDialogDescription>
                  هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بيانات هذه الدورة نهائياً.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteCycle}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* KPIs */}
      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            مؤشرات الأداء (KPIs)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">معامل التحويل (FCR)</span>
            <div
              className={`text-3xl font-bold ${cycle.fcr && cycle.fcr < 1.8 ? "text-green-600" : cycle.fcr && cycle.fcr > 2.2 ? "text-red-600" : "text-amber-600"}`}
            >
              {cycle.fcr?.toFixed(2) || "-"}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">نسبة النفوق</span>
            <div
              className={`text-3xl font-bold ${cycle.mortalityRate && cycle.mortalityRate < 5 ? "text-green-600" : cycle.mortalityRate && cycle.mortalityRate > 10 ? "text-red-600" : "text-amber-600"}`}
            >
              {cycle.mortalityRate?.toFixed(2) || "-"}%
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">متوسط الوزن (كجم)</span>
            <div className="text-3xl font-bold">{cycle.averageWeightKg?.toFixed(3) || "-"}</div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">تكلفة الكيلو (ج.م)</span>
            <div className="text-3xl font-bold">{cycle.costPerLiveKg?.toFixed(2) || "-"}</div>
          </div>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">ربح الطائر (ج.م)</span>
            <div className="text-3xl font-bold text-primary">
              {cycle.profitPerChick?.toFixed(2) || "-"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic + Costs + Financials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">البيانات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">تاريخ التسكين</span>
              <span className="font-semibold">
                {new Date(cycle.housingDate).toLocaleDateString("ar-EG")}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">عدد الكتاكيت</span>
              <span className="font-semibold">{cycle.chickCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">سعر الكتكوت</span>
              <span className="font-semibold">{cycle.chickPricePerUnit} ج.م</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">إجمالي تكلفة الكتاكيت</span>
              <span className="font-semibold">
                {(cycle.chickCount * cycle.chickPricePerUnit).toLocaleString()} ج.م
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">السلالة</span>
              <span className="font-semibold">{cycle.breed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              التكاليف والهلاك
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">العلف المستهلك</span>
              <span className="font-semibold">{cycle.totalFeedKg?.toLocaleString() || "-"} كجم</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">تكلفة العلف</span>
              <span className="font-semibold">{cycle.feedCostTotal?.toLocaleString() || "-"} ج.م</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">الأدوية والتحصينات</span>
              <span className="font-semibold">
                {cycle.totalMedicationCost?.toLocaleString() || "-"} ج.م
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">إجمالي النفوق</span>
              <span className="font-semibold text-destructive">
                {cycle.totalMortality?.toLocaleString() || "-"} طائر
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">مصروفات أخرى</span>
              <span className="font-semibold">{cycle.otherCosts?.toLocaleString() || "-"} ج.م</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              الماليات
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span className="text-muted-foreground">إجمالي الوزن المباع</span>
              <span className="font-semibold">{cycle.finalWeightKg?.toLocaleString() || "-"} كجم</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span className="text-muted-foreground">سعر البيع للكيلو</span>
              <span className="font-semibold">{cycle.salePricePerKg?.toFixed(2) || "-"} ج.م</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span className="text-muted-foreground">إجمالي التكاليف</span>
              <span className="font-semibold text-destructive">
                {cycle.totalCost?.toLocaleString() || "-"} ج.م
              </span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span className="text-muted-foreground">إجمالي الإيرادات</span>
              <span className="font-semibold text-green-600">
                {cycle.totalRevenue?.toLocaleString() || "-"} ج.م
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-bold text-lg">صافي الربح</span>
              <span className="font-bold text-xl text-primary">
                {cycle.netProfit?.toLocaleString() || "-"} ج.م
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Mortality Tracking */}
      <Card className="border-t-4 border-t-destructive/60">
        <CardHeader className="bg-destructive/5 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-destructive" />
              متابعة النفوق اليومي
            </CardTitle>
            {mortalityLogs && mortalityLogs.length > 0 && (
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  إجمالي مسجّل:{" "}
                  <span className="font-bold text-destructive">{totalFromLogs.toLocaleString()} طائر</span>
                </span>
                <span className="text-muted-foreground">
                  عدد الأيام:{" "}
                  <span className="font-bold">{mortalityLogs.length}</span>
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Add entry form */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm font-medium mb-3">تسجيل نفوق جديد</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-muted-foreground">التاريخ</label>
                <Input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-1 w-32">
                <label className="text-xs text-muted-foreground">العدد</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="0"
                  value={logCount}
                  onChange={(e) => setLogCount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-muted-foreground">ملاحظات (اختياري)</label>
                <Input
                  type="text"
                  placeholder="سبب النفوق، مرض، ..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddLog}
                  disabled={addLogMutation.isPending}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  تسجيل
                </Button>
              </div>
            </div>
          </div>

          {logsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : mortalityLogs && mortalityLogs.length > 0 ? (
            <>
              {/* Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number) => [`${value} طائر`, "النفوق"]}
                      labelFormatter={(label) => label}
                      cursor={{ fill: "hsl(var(--muted))" }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--destructive) / 0.7)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cumulative area chart */}
              {(() => {
                let cumulative = 0;
                const cumulativeData = chartData.map((d) => {
                  cumulative += d.count;
                  return { ...d, cumulative };
                });
                return (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">النفوق التراكمي</p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={cumulativeData}
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="mortalityGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            formatter={(value: number) => [`${value} طائر`, "إجمالي النفوق التراكمي"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="cumulative"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={2}
                            fill="url(#mortalityGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* Log table */}
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 font-medium">التاريخ</th>
                      <th className="text-right p-3 font-medium">يوم الدورة</th>
                      <th className="text-right p-3 font-medium">العدد</th>
                      <th className="text-right p-3 font-medium">ملاحظات</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mortalityLogs.map((log) => {
                      const date = new Date(log.logDate);
                      const dayNum =
                        Math.floor(
                          (date.getTime() - housingDate.getTime()) / (1000 * 60 * 60 * 24),
                        ) + 1;
                      return (
                        <tr key={log.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="p-3">{date.toLocaleDateString("ar-EG")}</td>
                          <td className="p-3 text-muted-foreground">يوم {dayNum}</td>
                          <td className="p-3 font-bold text-destructive">
                            {log.count.toLocaleString()} طائر
                          </td>
                          <td className="p-3 text-muted-foreground">{log.notes || "-"}</td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteLog(log.id)}
                              disabled={deleteLogMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <HeartPulse className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-base">لا توجد سجلات نفوق يومية بعد</p>
              <p className="text-sm mt-1">استخدم النموذج أعلاه لتسجيل النفوق اليومي</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
