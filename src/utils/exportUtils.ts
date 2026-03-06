import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Job {
  id: string;
  date: string;
  customerName: string;
  officeName: string;
  materialType: string;
  thickness: string;
  quantity: string;
  dimensions: string;
  runningMeter: string;
  piercingCount: string;
  rate: string;
  totalPrice: string;
}

export const exportToCSV = (jobs: Job[], filename: string = "jobs") => {
  const headers = [
    "Date",
    "Customer",
    "Office",
    "Material",
    "Thickness",
    "Quantity",
    "Dimensions",
    "Running Meter",
    "Piercing Count",
    "Rate",
    "Total Price",
  ];

  const rows = jobs.map((job) => [
    job.date,
    job.customerName,
    job.officeName,
    job.materialType,
    job.thickness,
    job.quantity,
    job.dimensions,
    job.runningMeter,
    job.piercingCount,
    job.rate,
    job.totalPrice,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (jobs: Job[], filename: string = "jobs") => {
  const headers = [
    "Date",
    "Customer",
    "Office",
    "Material",
    "Thickness",
    "Quantity",
    "Dimensions",
    "Running Meter",
    "Piercing Count",
    "Rate",
    "Total Price",
  ];

  const data = jobs.map((job) => ({
    Date: job.date,
    Customer: job.customerName,
    Office: job.officeName,
    Material: job.materialType,
    Thickness: job.thickness,
    Quantity: job.quantity,
    Dimensions: job.dimensions,
    "Running Meter": job.runningMeter,
    "Piercing Count": job.piercingCount,
    Rate: `₹${job.rate}`,
    "Total Price": `₹${job.totalPrice}`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");

  // Set column widths
  const columnWidths = [
    { wch: 12 }, // Date
    { wch: 20 }, // Customer
    { wch: 15 }, // Office
    { wch: 15 }, // Material
    { wch: 10 }, // Thickness
    { wch: 10 }, // Quantity
    { wch: 15 }, // Dimensions
    { wch: 15 }, // Running Meter
    { wch: 15 }, // Piercing Count
    { wch: 12 }, // Rate
    { wch: 15 }, // Total Price
  ];
  worksheet["!cols"] = columnWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = (jobs: Job[], filename: string = "jobs") => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Add title
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // Primary color
  doc.text("Job Management Report", 14, 15);

  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

  // Calculate totals
  const totalJobs = jobs.length;
  const totalRevenue = jobs.reduce(
    (sum, job) => sum + (Number(job.totalPrice) || 0),
    0
  );

  // Add summary
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Jobs: ${totalJobs}`, 14, 32);
  doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString()}`, 70, 32);

  // Prepare table data
  const tableData = jobs.map((job) => [
    job.date,
    job.customerName,
    job.officeName,
    job.materialType,
    job.thickness,
    job.quantity,
    job.dimensions,
    job.runningMeter,
    job.piercingCount,
    `₹${job.rate}`,
    `₹${Number(job.totalPrice).toLocaleString()}`,
  ]);

  // Add table
  autoTable(doc, {
    head: [
      [
        "Date",
        "Customer",
        "Office",
        "Material",
        "Thickness",
        "Qty",
        "Dimensions",
        "Running M",
        "Piercing",
        "Rate",
        "Total",
      ],
    ],
    body: tableData,
    startY: 40,
    theme: "grid",
    headStyles: {
      fillColor: [37, 99, 235], // Primary color
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Date
      1: { cellWidth: 30 }, // Customer
      2: { cellWidth: 25 }, // Office
      3: { cellWidth: 25 }, // Material
      4: { cellWidth: 18 }, // Thickness
      5: { cellWidth: 15 }, // Quantity
      6: { cellWidth: 25 }, // Dimensions
      7: { cellWidth: 20 }, // Running Meter
      8: { cellWidth: 18 }, // Piercing
      9: { cellWidth: 20 }, // Rate
      10: { cellWidth: 25 }, // Total
    },
    margin: { top: 40 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    },
  });

  doc.save(`${filename}.pdf`);
};
