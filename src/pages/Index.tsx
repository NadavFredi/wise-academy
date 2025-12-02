
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft, Star, Users, Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-0 mb-0">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="animate-fade-up">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              ברוכים הבאים ל-EasyFlow
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              אתר מעוצב להפליא המציג עקרונות עיצוב מודרניים וחוויית משתמש חלקה.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="group">
                <Link to="/about">
                  למידע נוסף
                  <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/contact">צור קשר</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-accent/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">למה לבחור ב-EasyFlow?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              חווה את השילוב המושלם בין פשטות לפונקציונליות עם התכונות המעוצבות בקפידה שלנו.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-8 w-8 text-primary" />,
                title: "מהיר כבזק",
                description: "ביצועים מותאמים לחוויית משתמש מיטבית"
              },
              {
                icon: <Users className="h-8 w-8 text-primary" />,
                title: "ידידותי למשתמש",
                description: "עיצוב אינטואיטיבי שכל אחד יכול לנווט בו בקלות"
              },
              {
                icon: <Star className="h-8 w-8 text-primary" />,
                title: "איכות פרימיום",
                description: "רכיבים באיכות גבוהה ותשומת לב לפרטים"
              }
            ].map((feature, index) => (
              <Card key={index} className="text-center hover:card-shadow-hover transition-all duration-300 border-0 card-shadow">
                <CardContent className="pt-8 pb-6">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Index;
