// src/pages/RecycleBin.tsx → FINAL FIXED & PERFECT VERSION
import { useEffect, useState } from "react";
import { ref, onValue, remove, set, push } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, Trash, Package, Users, Building, Wrench } from "lucide-react";
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
import { isAdmin } from "@/utils/auth";

interface RecycleBinItem {
  id: string;
  type: "customer" | "office" | "job" | "rateChartRow";
  data: any;
  originalPath: string; // e.g. customers/-N123abc or jobs/-Nxyz
  deletedAt: string;
}

const RecycleBin = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const hasEditPermission = isAdmin();

  useEffect(() => {
    const recycleBinRef = ref(db, "recycleBin");
    const unsubscribe = onValue(recycleBinRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          ...item,
        }));
        // Sort by newest first
        setItems(list.sort((a: any, b: any) => b.deletedAt.localeCompare(a.deletedAt)));
      } else {
        setItems([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // SAFE RESTORE: Use originalPath stored by moveToRecycleBin
  const handleRestore = async (item: RecycleBinItem) => {
    try {
      // Use the exact original path (e.g. customers/-Nabc123)
      await set(ref(db, item.originalPath), item.data);

      // Remove from recycle bin
      await remove(ref(db, `recycleBin/${item.id}`));

      toast({
        title: "Restored Successfully",
        description: `${getItemDisplayName(item)} has been restored`,
      });
    } catch (error: any) {
      console.error("Restore failed:", error);
      toast({
        title: "Restore Failed",
        description: error.message || "Could not restore item. It may already exist.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;
    try {
      await remove(ref(db, `recycleBin/${itemToDelete}`));
      toast({
        title: "Permanently Deleted",
        description: "Item removed forever",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const getItemDisplayName = (item: RecycleBinItem) => {
    if (item.type === "job") {
      return item.data.customerName || "Unnamed Job";
    }
    if (item.type === "customer") {
      const name = `${item.data.firstName || ""} ${item.data.lastName || ""}`.trim();
      return name || "Unnamed Customer";
    }
    if (item.type === "office") {
      return item.data.name || "Unnamed Office";
    }
    if (item.type === "rateChartRow") {
      return `${item.data.material || "Unknown"} - ${item.data.thickness}mm`;
    }
    return "Unknown Item";
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "customer": return <Users className="h-5 w-5" />;
      case "office": return <Building className="h-5 w-5" />;
      case "job": return <Wrench className="h-5 w-5" />;
      case "rateChartRow": return <Package className="h-5 w-5" />;
      default: return <Trash2 className="h-5 w-5" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      customer: "bg-blue-500",
      office: "bg-green-500",
      job: "bg-red-500",
      rateChartRow: "bg-purple-500",
    };
    return colors[type] || "bg-gray-500";
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-4">
              <Trash2 className="h-10 w-10 text-destructive" />
              Recycle Bin
            </h1>
            <p className="text-muted-foreground mt-2">Restore or permanently delete removed items</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {items.length} items
          </Badge>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-destructive/10 to-destructive/5">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Trash className="h-7 w-7" />
              Deleted Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {items.length === 0 ? (
              <div className="text-center py-20">
                <Trash2 className="h-20 w-20 mx-auto mb-6 text-muted-foreground/30" />
                <p className="text-xl text-muted-foreground">Recycle bin is empty</p>
                <p className="text-sm text-muted-foreground/70 mt-2">Deleted items will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-6 border rounded-xl hover:shadow-md transition-all bg-card"
                  >
                    <div className="flex items-center gap-5 flex-1">
                      <div className={`p-3 rounded-full ${getTypeBadge(item.type)} text-white`}>
                        {getIcon(item.type)}
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{getItemDisplayName(item)}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <Badge variant="secondary">{item.type}</Badge>
                          <span>Deleted {new Date(item.deletedAt).toLocaleDateString()} at {new Date(item.deletedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(item)}
                        className="gap-2 font-medium"
                        disabled={!hasEditPermission}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setItemToDelete(item.id);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={!hasEditPermission}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permanent Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Permanently Delete?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                This action <strong>cannot be undone</strong>. The item will be permanently removed from the recycle bin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePermanentDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default RecycleBin;
