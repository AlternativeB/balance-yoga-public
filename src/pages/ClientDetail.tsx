import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
} from "lucide-react";

// Mock client data
const mockClient = {
  id: "1",
  name: "Sarah Johnson",
  email: "sarah.johnson@email.com",
  phone: "+1 234-567-8901",
  dateOfBirth: "1990-05-15",
  status: "active" as const,
  source: "Online",
  registrationDate: "2024-01-15",
  subscription: {
    type: "Unlimited Monthly",
    status: "active",
    startDate: "2024-01-15",
    endDate: "2024-02-15",
    sessionsRemaining: null,
  },
  recentAttendance: [
    { id: 1, className: "Morning Vinyasa Flow", date: "2024-01-18", instructor: "Emma Wilson" },
    { id: 2, className: "Power Yoga", date: "2024-01-17", instructor: "Michael Chen" },
    { id: 3, className: "Yin Yoga", date: "2024-01-16", instructor: "Sarah Johnson" },
    { id: 4, className: "Gentle Hatha", date: "2024-01-15", instructor: "Emma Wilson" },
  ],
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // In a real app, you'd fetch client data based on id
  const client = mockClient;

  return (
    <AdminLayout>
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-6 gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/clients")}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Button>

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-semibold text-primary">
              {client.name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-muted-foreground mt-1">
              Member since {new Date(client.registrationDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button className="gap-2">
          <Edit className="w-4 h-4" />
          Edit Profile
        </Button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{client.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Phone className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{client.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="text-sm font-medium">
                  {new Date(client.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Active Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="w-4 h-4 text-primary" />
                </div>
                <StatusBadge status="active" />
              </div>
              <h4 className="font-medium text-foreground">{client.subscription.type}</h4>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Valid until {new Date(client.subscription.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Manage Subscription
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Classes Attended</span>
              <span className="text-lg font-semibold">12</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Classes Booked</span>
              <span className="text-lg font-semibold">3</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">No-shows</span>
              <span className="text-lg font-semibold">0</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {client.recentAttendance.map((attendance) => (
              <div
                key={attendance.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <CheckCircle className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{attendance.className}</p>
                    <p className="text-xs text-muted-foreground">
                      with {attendance.instructor}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(attendance.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default ClientDetail;
