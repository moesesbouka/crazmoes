import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  totalProducts: number;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  totalProducts,
}: SearchFilterBarProps) {
  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-card border-border shadow-soft focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={sortOption} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px] bg-card shadow-soft">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Name (A-Z)</SelectItem>
              <SelectItem value="title-desc">Name (Z-A)</SelectItem>
              <SelectItem value="price-asc">Price (Low to High)</SelectItem>
              <SelectItem value="price-desc">Price (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{totalProducts}</span> products
        </p>
      </div>
    </div>
  );
}
