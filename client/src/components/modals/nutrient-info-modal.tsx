import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type NutrientInfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nutrientName: string;
};

type NutrientInfo = {
  name: string;
  description: string;
  benefits: string[];
  sources: string[];
  unit: string;
  dailyValue?: number;
};

export default function NutrientInfoModal({ open, onOpenChange, nutrientName }: NutrientInfoModalProps) {
  const { data: nutrientInfo, isLoading } = useQuery({
    queryKey: ["/api/nutrients", nutrientName],
    enabled: open && !!nutrientName,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/nutrients/${nutrientName}`);
      return response.json() as Promise<NutrientInfo>;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-96 overflow-y-auto" data-testid="nutrient-info-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {nutrientInfo?.name || nutrientName}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
          </div>
        ) : nutrientInfo ? (
          <div className="space-y-4" data-testid="nutrient-info-content">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">What it does</h4>
              <p className="text-gray-700 text-sm">{nutrientInfo.description}</p>
            </div>
            
            {nutrientInfo.benefits && nutrientInfo.benefits.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Benefits for your body</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  {nutrientInfo.benefits.map((benefit, index) => (
                    <li key={index}>• {benefit}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {nutrientInfo.sources && nutrientInfo.sources.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Good sources</h4>
                <div className="flex flex-wrap gap-2">
                  {nutrientInfo.sources.map((source, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {nutrientInfo.dailyValue && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Daily Recommended Value</h4>
                <p className="text-gray-700 text-sm">
                  {nutrientInfo.dailyValue} {nutrientInfo.unit}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Nutrient information not available</p>
            <p className="text-sm text-gray-400 mt-2">
              We're working to provide comprehensive nutrient data.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
