import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Briefcase,
  IndianRupee, // Import IndianRupee icon
  Users,
  Building2,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format } from "date-fns";

interface Job {
  id: string;
  date: string;
  customerName: string;
  officeName: string;
  totalPrice: number;
}

const Dashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [indianDateTime, setIndianDateTime] = useState<string>("");

  // Real-time India time clock
  useEffect(() => {
    const updateClock = () => {
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
      };
      setIndianDateTime(new Date().toLocaleString("en-IN", options));
    };
    updateClock(); // initial call
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const jobsRef = ref(db, "jobs");
    const customersRef = ref(db, "customers");
    const officesRef = ref(db, "offices");
    const unsubscribeJobs = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const jobsList = Object.entries(data).map(([id, job]: [string, any]) => ({
          id,
          ...job,
        }));
        setJobs(jobsList);
      } else {
        setJobs([]);
      }
    });
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      setCustomers(data ? Object.values(data) : []);
    });
    const unsubscribeOffices = onValue(officesRef, (snapshot) => {
      const data = snapshot.val();
      setOffices(data ? Object.values(data) : []);
    });
    return () => {
      unsubscribeJobs();
      unsubscribeCustomers();
      unsubscribeOffices();
    };
  }, []);

  const totalRevenue = jobs.reduce((sum, job) => sum + (Number(job.totalPrice) || 0), 0);
  const today = format(new Date(), "yyyy-MM-dd");
  const todayJobs = jobs.filter((job) => job.date === today);
  const recentJobs = jobs.slice(-10).reverse();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = format(yesterday, "yyyy-MM-dd");
  const yesterdayRevenue = jobs
    .filter((job) => job.date === yesterdayDate)
    .reduce((sum, job) => sum + (Number(job.totalPrice) || 0), 0);
  const todayRevenue = todayJobs.reduce((sum, job) => sum + (Number(job.totalPrice) || 0), 0);
  const revenueChange = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : 0;
  const officeStats = offices.map((office) => ({
    name: office.name,
    jobCount: jobs.filter((job) => job.officeName === office.name).length,
    revenue: jobs
      .filter((job) => job.officeName === office.name)
      .reduce((sum, job) => sum + (Number(job.totalPrice) || 0), 0),
  }));

  const stats = [
    {
      title: "Total Jobs",
      value: jobs.length,
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10",
      change: `+${todayJobs.length} today`,
      trend: "up" as const,
    },
    {
      title: "Total Revenue",
      value: `₹${totalRevenue.toLocaleString()}`, // Rupee symbol here
      icon: IndianRupee, // Changed icon
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      change: `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`,
      trend: revenueChange >= 0 ? ("up" as const) : ("down" as const),
    },
    {
      title: "Customers",
      value: customers.length,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      change: "Active",
      trend: "neutral" as const,
    },
    {
      title: "Offices",
      value: offices.length,
      icon: Building2,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      change: "Locations",
      trend: "neutral" as const,
    },
    {
      title: "Jobs Today",
      value: todayJobs.length,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
      change: format(new Date(), "MMM dd"),
      trend: "neutral" as const,
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between space-y-2 xs:space-y-0 mb-2">
          {/* Top left: Indian time and date */}
          <div className="text-lg font-semibold text-primary bg-primary/10 rounded px-3 py-2 shadow-sm">
            {indianDateTime}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Dashboard Overview
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Welcome back! Here's what's happening today.
            </p>
          </div>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="relative overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  {stat.trend !== "neutral" && (
                    <div
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        stat.trend === "up" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {stat.trend === "up" ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden xs:inline">
                        {Math.abs(revenueChange).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-lg sm:text-xl font-bold truncate">{stat.value}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Jobs */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Recent Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {recentJobs.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No jobs yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-sm truncate">{job.customerName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{job.officeName}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 text-sm">
                            ₹{Number(job.totalPrice).toLocaleString()} {/* Rupee symbol */}
                          </p>
                          <p className="text-xs text-muted-foreground">{job.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Jobs by Office */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Jobs by Office
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {officeStats.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No offices yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {officeStats.map((office, index) => (
                      <div
                        key={index}
                        className="p-3 sm:p-4 hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{office.name}</p>
                              <p className="text-xs text-muted-foreground">{office.jobCount} jobs</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{office.jobCount}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="font-semibold text-green-600">
                            ₹{office.revenue.toLocaleString()} {/* Rupee symbol */}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
