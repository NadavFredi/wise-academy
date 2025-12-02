import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { format } from "date-fns";
import { he } from "date-fns/locale/he";
import type { Lesson } from "@/store/api/attendanceApi";

interface AttendanceChartProps {
  lessons: Lesson[];
  dates: string[];
  attendedData: number[];
  absentData: number[];
  onDateClick: (lesson: Lesson) => void;
}

export const AttendanceChart = ({
  lessons,
  dates,
  attendedData,
  absentData,
  onDateClick,
}: AttendanceChartProps) => {
  return (
    <div dir="rtl">
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          chart: {
            type: "line",
          },
          title: {
            text: "נוכחות לפי תאריך",
            style: {
              fontFamily: "inherit",
            },
          },
          xAxis: {
            categories: dates,
            title: {
              text: "תאריך",
              style: {
                fontFamily: "inherit",
              },
            },
            labels: {
              style: {
                fontFamily: "inherit",
              },
            },
          },
          yAxis: {
            title: {
              text: "מספר תלמידים",
              style: {
                fontFamily: "inherit",
              },
            },
            labels: {
              style: {
                fontFamily: "inherit",
              },
            },
          },
          series: [
            {
              name: "נוכחים",
              data: attendedData,
              color: "#22c55e",
            },
            {
              name: "נעדרים",
              data: absentData,
              color: "#ef4444",
            },
          ],
          legend: {
            align: "right",
            verticalAlign: "top",
            itemStyle: {
              fontFamily: "inherit",
            },
          },
          plotOptions: {
            line: {
              dataLabels: {
                enabled: true,
              },
              enableMouseTracking: true,
            },
            series: {
              point: {
                events: {
                  click: function (this: any) {
                    const dateIndex = this.x;
                    const lesson = lessons[dateIndex];
                    if (lesson) {
                      onDateClick(lesson);
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
              const dateIndex = this.x;
              const lesson = lessons[dateIndex];
              if (!lesson) return "";

              const date = format(new Date(lesson.lesson_date), "dd/MM/yyyy", { locale: he });
              let tooltip = `<div dir="rtl"><b>${date}</b><br/>`;

              this.points?.forEach((point: any) => {
                tooltip += `${point.series.name}: <b>${point.y}</b><br/>`;
              });

              tooltip += "</div>";
              return tooltip;
            },
          },
          lang: {
            loading: "טוען...",
            months: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"],
            weekdays: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
            shortMonths: ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"],
            rangeSelectorFrom: "מ",
            rangeSelectorTo: "עד",
            rangeSelectorZoom: "זום",
            downloadPNG: "הורד PNG",
            downloadJPEG: "הורד JPEG",
            downloadPDF: "הורד PDF",
            downloadSVG: "הורד SVG",
            printChart: "הדפס גרף",
          },
        }}
      />
    </div>
  );
};

