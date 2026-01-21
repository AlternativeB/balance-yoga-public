import { UserPlus, CreditCard, Calendar, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "new_client",
    title: "New client registered",
    description: "Maria Santos joined the studio",
    time: "5 min ago",
    icon: UserPlus,
    iconBg: "bg-success/10 text-success",
  },
  {
    id: 2,
    type: "subscription",
    title: "Subscription purchased",
    description: "John Doe - Unlimited Monthly",
    time: "23 min ago",
    icon: CreditCard,
    iconBg: "bg-primary/10 text-primary",
  },
  {
    id: 3,
    type: "booking",
    title: "Class booking",
    description: "Anna Lee booked Morning Vinyasa",
    time: "1 hour ago",
    icon: Calendar,
    iconBg: "bg-accent/10 text-accent",
  },
  {
    id: 4,
    type: "attendance",
    title: "Attendance confirmed",
    description: "12 check-ins for Power Yoga",
    time: "2 hours ago",
    icon: UserCheck,
    iconBg: "bg-warning/10 text-warning",
  },
];

export const RecentActivity = () => {
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="section-title mb-0">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg", activity.iconBg)}>
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
