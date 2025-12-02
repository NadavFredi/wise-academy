import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { setAuthenticated } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use Supabase Auth to authenticate the user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "שגיאה",
          description: error.message || "אימייל או סיסמה שגויים",
          variant: "destructive",
        });
        return;
      }

      if (data?.session) {
        dispatch(setAuthenticated(data.session.access_token));
        toast({
          title: "התחברות הצליחה",
          description: "ברוך הבא למערכת נוכחות",
        });
        navigate("/attendance");
      } else {
        toast({
          title: "שגיאה",
          description: "אימייל או סיסמה שגויים",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהתחברות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="flex-1 flex items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">התחברות מנהל</CardTitle>
            <CardDescription>הזן אימייל וסיסמה כדי לגשת למערכת נוכחות</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="הזן אימייל"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הזן סיסמה"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "מתחבר..." : "התחבר"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Login;

