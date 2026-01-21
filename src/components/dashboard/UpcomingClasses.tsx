import { Clock, Users } from "lucide-react";

const upcomingClasses = [
  {
    id: 1,
    name: "Morning Vinyasa Flow",
    instructor: "Sarah Johnson",
    time: "08:00",
    duration: "60 min",
    enrolled: 12,
    capacity: 15,
  },
  {
    id: 2,
    name: "Gentle Hatha",
    instructor: "Michael Chen",
    time: "10:00",
    duration: "75 min",
    enrolled: 8,
    capacity: 12,
  },
  {
    id: 3,
    name: "Power Yoga",
    instructor: "Emma Wilson",
    time: "12:00",
    duration: "60 min",
    enrolled: 15,
    capacity: 15,
  },
  {
    id: 4,
    name: "Yin Yoga",
    instructor: "Sarah Johnson",
    time: "17:00",
    duration: "90 min",
    enrolled: 6,
    capacity: 10,
  },
];

export const UpcomingClasses = () => {
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="section-title mb-0">Today's Classes</h3>
      </div>
      <div className="divide-y divide-border">
        {upcomingClasses.map((classItem) => (
          <div
            key={classItem.id}
            className="p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">
                  {classItem.name}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {classItem.instructor}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {classItem.time}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {classItem.duration}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {classItem.enrolled}/{classItem.capacity}
                </span>
              </div>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${(classItem.enrolled / classItem.capacity) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
