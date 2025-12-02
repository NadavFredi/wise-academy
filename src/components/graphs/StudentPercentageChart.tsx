import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

interface StudentData {
  studentId: string;
  studentName: string;
  totalAttended: number;
  totalAbsent: number;
  percentage: number;
}

interface StudentPercentageChartProps {
  data: StudentData[];
  onStudentClick: (studentData: StudentData) => void;
}

export const StudentPercentageChart = ({
  data,
  onStudentClick,
}: StudentPercentageChartProps) => {
  return (
    <div dir="rtl">
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          chart: {
            type: "bar",
          },
          title: {
            text: "אחוז נוכחות לכל תלמיד",
          },
          xAxis: {
            categories: data.map((d) => d.studentName),
            title: {
              text: "תלמיד",
            },
          },
          yAxis: {
            title: {
              text: "אחוז נוכחות (%)",
            },
            max: 100,
          },
          series: [
            {
              name: "אחוז נוכחות",
              data: data.map((d) => d.percentage),
              color: "#3b82f6",
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
                format: "{y}%",
              },
              enableMouseTracking: true,
              point: {
                events: {
                  click: function (this: any) {
                    const studentIndex = this.x;
                    const studentData = data[studentIndex];
                    if (studentData) {
                      onStudentClick(studentData);
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
              tooltip += `אחוז נוכחות: <b>${studentData.percentage}%</b><br/>`;
              tooltip += `נוכחויות: <b>${studentData.totalAttended}</b><br/>`;
              tooltip += `היעדרויות: <b>${studentData.totalAbsent}</b></div>`;
              return tooltip;
            },
          },
        }}
      />
    </div>
  );
};

