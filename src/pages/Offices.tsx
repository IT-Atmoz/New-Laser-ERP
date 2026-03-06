// src/pages/Offices.tsx → FINAL VERSION | Add = All Users | Delete = Admin Only
import { useEffect, useState } from "react";
import { ref, onValue, push, remove } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Building2 } from "lucide-react";
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
import { isAdmin } from "@/utils/auth";

interface Office {
  id: string;
  name: string;
}

const Offices = () => {
  const { toast } = useToast();
  const [offices, setOffices] = useState<Office[]>([]);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState<Office | null>(null);

  // Only used for Delete permission
  const hasEditPermission = isAdmin();

  useEffect(() => {
    const officesRef = ref(db, "offices");
    const unsubscribe = onValue(officesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const officesList = Object.entries(data).map(([id, office]: [string, any]) => ({
          id,
          name: office.name || "Unnamed Office",
        }));
        setOffices(officesList);
      } else {
        setOffices([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Add Office — AVAILABLE TO ALL USERS
  const handleAddOffice = async () => {
    if (!newOfficeName.trim()) {
      toast({
        title: "Error",
        description: "Office name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    try {
      const officesRef = ref(db, "offices");
      await push(officesRef, { name: newOfficeName.trim() });
      setNewOfficeName("");
      toast({
        title: "Success",
        description: `"${newOfficeName.trim()}" has been added successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add office",
        variant: "destructive",
      });
    }
  };

  // Delete Office — ADMIN ONLY
  const handleDelete = async () => {
    if (!officeToDelete) return;
    try {
      await moveToRecycleBin(officeToDelete.id, "office", `offices/${officeToDelete.id}`);
      await remove(ref(db, `offices/${officeToDelete.id}`));
      toast({
        title: "Office Deleted",
        description: `"${officeToDelete.name}" moved to recycle bin`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete office",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setOfficeToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Building2 className="h-10 w-10 text-primary" />
            Office Management
          </h1>
          <p className="text-muted-foreground">Add and manage office/branch locations</p>
        </div>

        {/* Add New Office — Open to All Users */}
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <PlusCircle className="h-7 w-7 text-primary" />
              Add New Office
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-3 max-w-2xl">
              <Input
                placeholder="Enter office name (e.g. Chennai Branch, Coimbatore Unit)"
                value={newOfficeName}
                onChange={(e) => setNewOfficeName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddOffice()}
                className="text-lg"
              />
              {/* Add Button — Always Enabled */}
              <Button onClick={handleAddOffice} size="lg" className="px-8 shadow-md">
                <PlusCircle className="mr-2 h-5 w-5" />
                Add Office
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Anyone can add new offices • Only admins can delete
            </p>
          </CardContent>
        </Card>

        {/* Offices List */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">
              All Offices ({offices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {offices.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No offices added yet</p>
                <p className="text-sm mt-2">Start by adding your first office above</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-lg">Office Name</TableHead>
                    <TableHead className="text-right w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offices.map((office) => (
                    <TableRow key={office.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-semibold text-lg py-4">
                        {office.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setOfficeToDelete(office);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={!hasEditPermission}
                          title={hasEditPermission ? "Delete office" : "Only admins can delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Office?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move <strong>"{officeToDelete?.name}"</strong> to the recycle bin.
                <br />
                You can restore it later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Office
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Offices;
