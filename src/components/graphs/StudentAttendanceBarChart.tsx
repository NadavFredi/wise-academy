import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

interface StudentData {
  studentId: string;
  studentName: string;
  totalAttended: number;
  totalAbsent: number;
  percentage: number;
}

interface StudentAttendanceBarChartProps {
  data: StudentData[];
  onStudentClick: (studentData: StudentData, type: 'attendance' | 'absence') => void;
}

export const StudentAttendanceBarChart = ({
  data,
  onStudentClick,
}: StudentAttendanceBarChartProps) => {
  return (
    <div dir="rtl">
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          chart: {
            type: "bar",
          },
          title: {
            text: "נוכחויות והיעדרויות לכל תלמיד",
          },
          xAxis: {
            categories: data.map((d) => d.studentName),
            title: {
              text: "תלמיד",
            },
          },
          yAxis: {
            title: {
              text: "מספר שיעורים",
            },
          },
          series: [
            {
              name: "נוכחויות",
              data: data.map((d) => d.totalAttended),
              color: "#22c55e",
            },
            {
              name: "היעדרויות",
              data: data.map((d) => d.totalAbsent),
              color: "#ef4444",
            },
          ],
          legend: {
            align: "right",
            verticalAlign: "top",
          },
          plotOptions: {
            bar: {
              dataLabels: {
                enabled: true,
              },
              enableMouseTracking: true,
              point: {
                events: {
                  click: function (this: any) {
                    const studentIndex = this.x;
                    const studentData = data[studentIndex];
                    if (studentData) {
                      if (this.series.name === "נוכחויות") {
                        onStudentClick(studentData, 'attendance');
                      } else {
                        onStudentClick(studentData, 'absence');
                      }
                    }
                  },
                },
              },
            },
          },
          tooltip: {
            shared: true,
            useHTML: true,
            formatter: function (this: any) {
              const studentIndex = this.x;
              const studentData = data[studentIndex];
              if (!studentData) return "";

              let tooltip = `<div dir="rtl"><b>${studentData.studentName}</b><br/>`;
              this.points?.forEach((point: any) => {
                tooltip += `${point.series.name}: <b>${point.y}</b><br/>`;
              });
              tooltip += `אחוז נוכחות: <b>${studentData.percentage}%</b></div>`;
              return tooltip;
            },
          },
        }}
      />
    </div>
  );
};

