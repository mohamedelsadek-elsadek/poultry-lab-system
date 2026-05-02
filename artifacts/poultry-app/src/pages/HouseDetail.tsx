import { useParams, Link } from "wouter";
import { useListCycles, useListHouses, useGetFarm, getGetFarmQueryKey, getListHousesQueryKey, getListCyclesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Factory, History, AlertCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HouseDetail() {
  const params = useParams();
  const farmId = parseInt(params.farmId || "0", 10);
  const houseId = parseInt(params.houseId || "0", 10);
  
  const { data: farm, isLoading: loadingFarm } = useGetFarm(farmId, { query: { enabled: !!farmId, queryKey: getGetFarmQueryKey(farmId) } });
  const { data: houses, isLoading: loadingHouses } = useListHouses(farmId, { query: { enabled: !!farmId, queryKey: getListHousesQueryKey(farmId) } });
  const { data: cycles, isLoading: loadingCycles } = useListCycles(houseId, { query: { enabled: !!houseId, queryKey: getListCyclesQueryKey(houseId) } });

  const house = houses?.find(h => h.id === houseId);
  const isLoading = loadingFarm || loadingHouses || loadingCycles;

  if (isLoading || !house || !farm) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const activeCycles = cycles?.filter(c => c.status === 'active') || [];
  const completedCycles = cycles?.filter(c => c.status === 'completed') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/farms/${farmId}`} className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowRight className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Factory className="h-8 w-8" />
            {house.nameAr || house.name}
          </h1>
          <p className="text-muted-foreground">{farm.nameAr || farm.name} • {house.areaM2} م²</p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8 mb-4">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <History className="h-6 w-6" />
          سجل الدورات
        </h2>
        <div className="flex gap-2">
          <Link href={`/farms/${farmId}/houses/${houseId}/report`}>
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              تقرير الأداء
            </Button>
          </Link>
          <Link href={`/cycles/new?farmId=${farmId}&houseId=${houseId}`}>
            <Button>بدء دورة جديدة</Button>
          </Link>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">رقم الدورة</TableHead>
              <TableHead className="text-right">تاريخ التسكين</TableHead>
              <TableHead className="text-right">السلالة</TableHead>
              <TableHead className="text-right">عدد الكتاكيت</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">معامل التحويل</TableHead>
              <TableHead className="text-right">نسبة النفوق</TableHead>
              <TableHead className="text-right">صافي الربح</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
                    <p>لا توجد دورات مسجلة لهذا العنبر</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              cycles?.map((cycle) => (
                <TableRow key={cycle.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/cycles/${cycle.id}`}>
                  <TableCell className="font-medium">#{cycle.cycleNumber}</TableCell>
                  <TableCell>{new Date(cycle.housingDate).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell>{cycle.breed}</TableCell>
                  <TableCell>{cycle.chickCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>
                      {cycle.status === 'active' ? 'نشطة' : 'مكتملة'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cycle.fcr ? (
                      <span className={`font-bold ${cycle.fcr < 1.8 ? 'text-green-600' : cycle.fcr > 2.2 ? 'text-red-600' : 'text-amber-600'}`}>
                        {cycle.fcr.toFixed(2)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{cycle.mortalityRate ? `${cycle.mortalityRate.toFixed(2)}%` : '-'}</TableCell>
                  <TableCell className="font-bold text-primary">
                    {cycle.netProfit ? `${cycle.netProfit.toLocaleString()} ج.م` : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
