import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Loader2, Zap, Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Sun, Moon } from "lucide-react";
import { useTheme } from "../components/ThemeProvider";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState<"email" | "password" | null>(null);
  const [mounted, setMounted] = useState(false);
  const { signIn, isLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!email || !password) {
      toast({
        title: "Gagal Login ⚠️",
        description: "Email dan Password harus diisi.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email Tidak Valid ⚠️",
        description: "Mohon masukkan format email yang benar.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await signIn(email, password);
      
      toast({
        title: "Login Berhasil 🎉",
        description: "Anda berhasil masuk ke FINTRACK Affiliate System.",
        duration: 2000,
      });
      
      navigate("/dashboard");
    
    } catch (error: any) {
      let errorMessage = "Terjadi kesalahan saat login. Silakan coba lagi.";
      
      if (error.message && (error.message.includes("Invalid login credentials") || error.message.includes("invalid_grant"))) {
        errorMessage = "Email atau Password salah. Mohon periksa kembali.";
      } else if (error.message && error.message.includes("Email not confirmed")) {
        errorMessage = "Akun Anda belum terverifikasi. Mohon cek email Anda.";
      } else if (error.message && error.message.includes("User not found")) {
        errorMessage = "Akun tidak ditemukan. Silakan hubungi Superadmin.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Login Gagal 🔴",
        description: errorMessage,
        variant: "destructive",
      });

    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 relative overflow-hidden">
      {/* Theme Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 dark:bg-indigo-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200 dark:bg-purple-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg transform transition-all duration-500 hover:scale-[1.01]">
        <CardHeader className="text-center space-y-2 sm:space-y-4">
          <div className="relative mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur-lg opacity-75 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full p-3">
              <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            FINTRACK Affiliate System
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Sistem Manajemen Affiliate Marketing by FahmyID Group
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6">
          {(isLoading && !user) || isSubmitting ? (
            <div className="flex flex-col justify-center items-center h-40 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-200 dark:bg-blue-800 rounded-full animate-ping"></div>
                <Loader2 className="relative h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Memproses login...</span>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="emailkamu@gmail.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsFocused("email")}
                    onBlur={() => setIsFocused(null)}
                    disabled={isSubmitting}
                    className={`h-10 sm:h-11 pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 ${
                      isFocused === "email" 
                        ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800" 
                        : ""
                    }`}
                  />
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                    isFocused === "email" ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                  }`} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsFocused("password")}
                    onBlur={() => setIsFocused(null)}
                    disabled={isSubmitting}
                    className={`h-10 sm:h-11 pl-10 pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 ${
                      isFocused === "password" 
                        ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800" 
                        : ""
                    }`}
                  />
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${
                    isFocused === "password" ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                  }`} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={togglePasswordVisibility}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                  />
                  <Label htmlFor="remember" className="text-gray-600 dark:text-gray-400">
                    Ingat saya
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                >
                  Lupa password?
                </Button>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 dark:from-blue-600 dark:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-800 h-10 sm:h-11 text-sm sm:text-base font-medium shadow-lg transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-white"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Login Sekarang</span>
                    <Zap className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col items-center justify-center px-4 sm:px-6 pt-2 pb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-3 w-3" />
            <span>Hubungi IT Support jika mengalami kendala</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2025 PT FAHMYID DIGITAL GROUP
          </p>
        </CardFooter>
      </Card>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;