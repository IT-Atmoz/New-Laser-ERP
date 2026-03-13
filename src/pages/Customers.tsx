// src/components/customers/Customers.tsx → FINAL VERSION WITH FULL EDIT (Add Customer = No Role Check)
import { useEffect, useState } from "react";
import { ref, onValue, push, remove, set } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Edit, Users, Mail, Phone, MapPin, FileText, Save, X, Search } from "lucide-react";
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
import { isAdmin } from "@/utils/auth";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  gst: string;
  fullName: string;
}

const Customers = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const hasEditPermission = isAdmin(); // Only used for Edit & Delete

  // Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    gst: "",
  });
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    gst: "",
  });

  // Load Customers
  useEffect(() => {
    const customersRef = ref(db, "customers");
    const unsubscribe = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, cust]: [string, any]) => ({
          id,
          firstName: cust.firstName || "",
          lastName: cust.lastName || "",
          email: cust.email || "",
          phone: cust.phone || "",
          address: cust.address || "",
          gst: cust.gst || "",
          fullName: `${cust.firstName || ""} ${cust.lastName || ""}`.trim(),
        }));
        setCustomers(list);
      } else {
        setCustomers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Add Customer — ANYONE can add (no role check)
  const handleAddCustomer = async () => {
    if (!addForm.firstName.trim()) {
      toast({ title: "Error", description: "First name is required", variant: "destructive" });
      return;
    }
    const newFullName = `${addForm.firstName.trim()} ${addForm.lastName.trim()}`.trim().toLowerCase();
    const duplicate = customers.find(
      (c) => `${c.firstName} ${c.lastName}`.trim().toLowerCase() === newFullName
    );
    if (duplicate) {
      toast({
        title: "Already Exists",
        description: `A customer named "${duplicate.fullName}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await push(ref(db, "customers"), {
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        address: addForm.address.trim(),
        gst: addForm.gst.trim().toUpperCase(),
      });
      toast({
        title: "Customer Added",
        description: `${addForm.firstName} ${addForm.lastName || ""} added successfully`,
      });
      setAddForm({ firstName: "", lastName: "", email: "", phone: "", address: "", gst: "" });
    } catch {
      toast({ title: "Error", description: "Failed to add customer", variant: "destructive" });
    }
  };

  // Edit Customer — Only Admin
  const openEditDialog = (customer: Customer) => {
    setCustomerToEdit(customer);
    setEditForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      gst: customer.gst,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!customerToEdit || !editForm.firstName.trim()) {
      toast({ title: "Error", description: "First name is required", variant: "destructive" });
      return;
    }
    try {
      await set(ref(db, `customers/${customerToEdit.id}`), {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        gst: editForm.gst.trim().toUpperCase(),
      });
      toast({
        title: "Updated",
        description: `${editForm.firstName} ${editForm.lastName || ""} updated successfully`,
      });
      setEditDialogOpen(false);
      setCustomerToEdit(null);
    } catch {
      toast({ title: "Error", description: "Failed to update customer", variant: "destructive" });
    }
  };

  // Delete Customer — Only Admin
  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await moveToRecycleBin(customerToDelete.id, "customer", `customers/${customerToDelete.id}`);
      await remove(ref(db, `customers/${customerToDelete.id}`));
      toast({
        title: "Deleted",
        description: `${customerToDelete.fullName} moved to recycle bin`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to delete customer", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Users className="h-10 w-10 text-primary" />
            Customer Management
          </h1>
          <p className="text-muted-foreground">Add, edit, and manage customer details with full contact & GST info</p>
        </div>

        {/* Add New Customer — Available to ALL users */}
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <PlusCircle className="h-7 w-7 text-primary" />
              Add New Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  placeholder="John"
                  value={addForm.firstName}
                  onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  placeholder="Doe"
                  value={addForm.lastName}
                  onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</Label>
                <Input
                  placeholder="123, ABC Street, Chennai"
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><FileText className="h-4 w-4" /> GST Number</Label>
                <Input
                  placeholder="22AAAAA0000A1Z5"
                  value={addForm.gst}
                  onChange={(e) => setAddForm({ ...addForm, gst: e.target.value.toUpperCase() })}
                  maxLength={15}
                />
              </div>
            </div>
            <div className="flex justify-end mt-10">
              {/* Add Button — NO ROLE CHECK */}
              <Button size="lg" onClick={handleAddCustomer} className="px-10 shadow-md">
                <PlusCircle className="mr-2 h-5 w-5" />
                Add Customer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-2xl">All Customers ({customers.length})</CardTitle>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const filtered = q
                ? customers.filter(
                    (c) =>
                      c.fullName.toLowerCase().includes(q) ||
                      c.email.toLowerCase().includes(q) ||
                      c.phone.toLowerCase().includes(q) ||
                      c.gst.toLowerCase().includes(q) ||
                      c.address.toLowerCase().includes(q)
                  )
                : customers;
              return filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">{q ? "No customers match your search" : "No customers added yet"}</p>
                  <p className="text-sm mt-2">{q ? "Try a different search term" : "Start by adding your first customer above"}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="text-right w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-semibold text-lg">
                            {customer.fullName || "Unnamed"}
                          </TableCell>
                          <TableCell>{customer.email || "—"}</TableCell>
                          <TableCell>{customer.phone || "—"}</TableCell>
                          <TableCell>
                            {customer.gst ? (
                              <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono">
                                {customer.gst}
                              </code>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {customer.address || "—"}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(customer)}
                              className="hover:bg-blue-50"
                              disabled={!hasEditPermission}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setCustomerToDelete(customer);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={!hasEditPermission}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Edit className="h-6 w-6" />
                Edit Customer
              </DialogTitle>
              <DialogDescription>
                Update customer details. Changes are saved instantly.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input
                  value={editForm.gst}
                  onChange={(e) => setEditForm({ ...editForm, gst: e.target.value.toUpperCase() })}
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleUpdateCustomer}>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move <strong>{customerToDelete?.fullName || "this customer"}</strong> to the recycle bin.
                You can restore it later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete Customer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
