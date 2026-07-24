import React, { useState } from "react";
import { User, Lock, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface LoginViewProps {
  salespersons: string[];
  onLogin: (name: string) => void;
  loading: boolean;
}

export default function LoginView({ salespersons, onLogin, loading }: LoginViewProps) {
  const [selectedSp, setSelectedSp] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  React.useEffect(() => {
    if (salespersons.length > 0 && !selectedSp) {
      setSelectedSp(salespersons[0]);
    }
  }, [salespersons, selectedSp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSp) {
      setError("กรุณาเลือกพนักงานขายเพื่อเข้าใช้งาน");
      return;
    }

    if (pin !== "1234") {
      setError("รหัส PIN ไม่ถูกต้อง (ทดลองใช้รหัส: 1234)");
      return;
    }

    onLogin(selectedSp);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6" id="login-screen-root">
      {/* Outer Card with ambient shadows */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden p-6 sm:p-8 space-y-6"
        id="login-card"
      >
        {/* Brand Banner Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs">
            ML
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-sans">
              Mylogiz CRM Portal
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              ระบบล็อกอินเข้าใช้งานพนักงานขายและขนส่งร่วม
            </p>
          </div>
        </div>

        {/* Informational PIN Notice */}
        <div id="pin-notice-banner" className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-blue-800 leading-relaxed">
            <span className="font-bold block">🔐 ข้อมูลสิทธิ์ความปลอดภัย</span>
            เลือกรายชื่อพนักงานขายของคุณเพื่อยืนยันตัวตน และป้อนรหัสผ่าน <strong className="bg-blue-100 px-1 rounded text-blue-900">1234</strong> เพื่อเข้าสู่ระบบจัดเก็บข้อมูล Leads ขนส่ง
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          
          {/* Salesperson Selector */}
          <div className="space-y-1.5">
            <label htmlFor="salesperson-select" className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>เลือกพนักงานขายของคุณ</span>
            </label>
            
            {loading ? (
              <div className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg animate-pulse" />
            ) : salespersons.length === 0 ? (
              <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded-lg border border-amber-100">
                ⚠️ ยังไม่มีข้อมูลพนักงานขายในระบบ กรุณาแอดมินตั้งค่าก่อน
              </div>
            ) : (
              <select
                id="salesperson-select"
                value={selectedSp}
                onChange={(e) => {
                  setSelectedSp(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold transition-all cursor-pointer"
              >
                {salespersons.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Secure PIN Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="pin-input" className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>รหัสผ่านประจำตัว (PIN)</span>
              </label>
              <button 
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>ช่วยเหลือ</span>
              </button>
            </div>

            {showHelp && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-lg leading-relaxed mb-1"
              >
                💡 สำหรับการทดสอบหรือใช้ในแคมเปญส่งเสริมการปิดดีล CRM รหัสความปลอดภัยส่วนบุคคลของเซลส์แต่ละท่านถูกตั้งเป็นค่าเริ่มต้นคือ <strong className="text-slate-800">1234</strong>
              </motion.div>
            )}

            <input
              id="pin-input"
              type="password"
              maxLength={6}
              required
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 transition-all"
            />
          </div>

          {/* Error message bubble */}
          {error && (
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              id="login-error-msg" 
              className="p-2.5 text-center text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          {/* Submit Action Button */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={salespersons.length === 0}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>ยืนยันเข้าสู่ระบบ</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>
      </motion.div>

      {/* Security notice footer */}
      <p className="text-[10px] text-slate-400 mt-6 font-medium tracking-wide">
        ระบบบันทึกความปลอดภัยด้วยเทคโนโลยี SSL & Mylogiz Cloud Storage • สงวนลิขสิทธิ์ 2569
      </p>
    </div>
  );
}
