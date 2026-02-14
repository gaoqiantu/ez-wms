import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product, Inventory } from '@/db/schema';

interface ProductCardProps {
  product: Product;
  inventory?: Inventory | null;
  showStock?: boolean;
}

export function ProductCard({ product, inventory, showStock = true }: ProductCardProps) {
  const totalPcs = inventory
    ? (inventory.boxQty || 0) * (product.pcsPerBox || 1) + (inventory.pcsQty || 0)
    : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">{product.itemCode}</span>
            </div>
            <h3 className="font-medium">{product.description}</h3>
            <div className="text-sm text-muted-foreground">
              ${product.priceEach.toFixed(2)} / {product.unit}
            </div>
          </div>
        </div>

        {showStock && inventory && (
          <div className="mt-3 flex items-center gap-4 rounded-md bg-muted/50 p-2 text-sm">
            <div>
              <span className="text-muted-foreground">Boxes: </span>
              <span className="font-medium">{inventory.boxQty || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Pcs: </span>
              <span className="font-medium">{inventory.pcsQty || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-medium">{totalPcs} pcs</span>
            </div>
            {inventory.location && (
              <div className="ml-auto">
                <Badge variant="outline">{inventory.location}</Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
