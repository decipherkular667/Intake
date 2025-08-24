import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NutrientInfoProps = {
  nutrientName: string;
  value: number;
  unit: string;
  onClick?: () => void;
  className?: string;
};

export default function NutrientInfo({ 
  nutrientName, 
  value, 
  unit, 
  onClick, 
  className = "" 
}: NutrientInfoProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="text-right">
        <div className="font-medium text-gray-900">
          {Math.round(value)}{unit}
        </div>
        <div className="text-xs text-gray-500 capitalize">{nutrientName}</div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-custom p-1 h-auto"
            onClick={onClick}
            data-testid={`nutrient-info-${nutrientName}`}
          >
            <Info className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click for detailed {nutrientName} information</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
