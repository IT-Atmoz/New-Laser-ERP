import { useEffect, useState } from "react";
import { ref, push, onValue, remove } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Maximize2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
import { isAdmin } from "@/utils/auth";

interface Dimension {
  id: string;
  name: string;
}

const Dimensions = () => {
  const { toast } = useToast();
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [newDimension, setNewDimension] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Dimension | null>(null);
  const hasEditPermission = isAdmin();

  useEffect(() => {
    const dimensionsRef = ref(db, "dimensions");
    const unsubscribe = onValue(dimensionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const dimensionsList = Object.entries(data).map(([id, name]: [string, any]) => ({
          id,
          name: typeof name === 'string' ? name : name.name || '',
        }));
        setDimensions(dimensionsList);
      } else {
        setDimensions([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!newDimension.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dimension",
        variant: "destructive",
      });
      return;
    }

    try {
      const dimensionsRef = ref(db, "dimensions");
      await push(dimensionsRef, newDimension.trim());
      setNewDimension("");
      toast({
        title: "Success",
        description: "Dimension added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add dimension",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await moveToRecycleBin(itemToDelete.id, "dimension", `dimensions/${itemToDelete.id}`);
      await remove(ref(db, `dimensions/${itemToDelete.id}`));
      toast({
        title: "Success",
        description: "Dimension moved to recycle bin",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete dimension",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Dimensions</h1>
          <p className="text-muted-foreground">Manage dimension specifications (e.g., 480X305, 1250X1300)</p>
        </div>

        <Card className="p-6 bg-gradient-to-r from-background to-muted/30">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter dimension (e.g., 480X305, 1250X1300)"
              value={newDimension}
              onChange={(e) => setNewDimension(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} className="gap-2" disabled={!hasEditPermission}>
              <Plus className="h-4 w-4" />
              Add Dimension
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Maximize2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Dimensions List</h2>
            <Badge variant="secondary" className="ml-2">
              {dimensions.length}
            </Badge>
          </div>

          {dimensions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Maximize2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No dimensions added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dimensions.map((dimension) => (
                <div
                  key={dimension.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{dimension.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setItemToDelete(dimension);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={!hasEditPermission}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dimension?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move "{itemToDelete?.name}" to the recycle bin. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Dimensions;
