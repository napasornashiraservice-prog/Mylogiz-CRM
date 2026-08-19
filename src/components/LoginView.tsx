import React, { useState } from "react";
import { User, Lock, ArrowRight, ShieldCheck, HelpCircle, KeyRound, Check, RefreshCw, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

interface LoginViewProps {
  salespersons: string[];
  userPasswords?: Record<string, string>;
  onLogin: (name: string) => void;
  onUpdatePassword?: (salespersonName: string, newPass: string) => Promise<boolean>;
  loading: boolean;
}

export default function LoginView({ salespersons, userPasswords = {}, onLogin, onUpdatePassword, loading }: LoginViewProps) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // States for resetting / setting password
  const [resetUsername, setResetUsername] = useState<string>("");
  const [currentPass, setCurrentPass] = useState<string>("");
  const [newPass, setNewPass] = useState<string>("");
  const [confirmPass, setConfirmPass] = useState<string>("");
  const [isSubmittingReset, setIsSubmittingReset] = useState<boolean>(false);

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = usernameInput.trim();
    if (!trimmedUser) {
      setError("กรุณากรอกชื่อผู้ใช้งาน (Username / ชื่อเซลส์)");
      return;
    }

    // Try to match existing salesperson case-insensitively
    const matchedSp = salespersons.find(
      (s) => s.toLowerCase() === trimmedUser.toLowerCase()
    ) || trimmedUser;

    const expectedPass = userPasswords[matchedSp] || userPasswords[trimmedUser] || "1234";

    if (pin.trim() !== expectedPass) {
      setError("รหัสผ่านไม่ถูกต้อง (หากเพิ่งเริ่มใช้งานใช้รหัสผ่าน 1234 หรือรหัสผ่านที่คุณเคยตั้งไว้)");
      return;
    }

    onLogin(matchedSp);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedResetUser = resetUsername.trim();
    if (!trimmedResetUser) {
      setError("กรุณากรอกชื่อผู้ใช้งาน (Username / ชื่อเซลส์)");
      return;
    }

    const matchedSp = salespersons.find(
      (s) => s.toLowerCase() === trimmedResetUser.toLowerCase()
    ) || trimmedResetUser;

    const expectedCurrentPass = userPasswords[matchedSp] || userPasswords[trimmedResetUser] || "1234";
    if (currentPass.trim() !== expectedCurrentPass) {
      setError("รหัสผ่านปัจจุบันไม่ถูกต้อง (รหัสเริ่มต้นคือ 1234)");
      return;
    }

    if (!newPass.trim() || newPass.trim().length < 4) {
      setError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
      return;
    }

    if (newPass.trim() !== confirmPass.trim()) {
      setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (onUpdatePassword) {
      setIsSubmittingReset(true);
      const success = await onUpdatePassword(matchedSp, newPass.trim());
      setIsSubmittingReset(false);

      if (success) {
        setSuccessMsg(`ตั้งรหัสผ่านใหม่สำหรับคุณ ${matchedSp} เรียบร้อยแล้ว!`);
        setUsernameInput(matchedSp);
        setPin(newPass.trim());
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
      } else {
        setError("ไม่สามารถบันทึกรหัสผ่านใหม่ได้ กรุณาลองใหม่อีกครั้ง");
      }
    }
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

        {/* Mode Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold" id="login-mode-tabs">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${
              mode === "login" ? "bg-white text-blue-600 shadow-xs font-extrabold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🔐 เข้าสู่ระบบ (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("reset");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${
              mode === "reset" ? "bg-white text-blue-600 shadow-xs font-extrabold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🔑 ตั้งรหัสผ่านเข้าเอง
          </button>
        </div>

        {mode === "login" ? (
          <>
            {/* Informational PIN Notice */}
            <div id="pin-notice-banner" className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-blue-800 leading-relaxed">
                <span className="font-bold block">🔐 ข้อมูลสิทธิ์ความปลอดภัย</span>
                กรอกชื่อผู้ใช้งาน (Username) และรหัสผ่านเพื่อเข้าสู่ระบบ (รหัสเริ่มต้นคือ <strong className="bg-blue-100 px-1 rounded text-blue-900">1234</strong> หรือรหัสผ่านที่คุณเคยตั้งไว้)
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmitLogin} className="space-y-4" id="login-form">
              
              {/* Username Input */}
              <div className="space-y-1.5">
                <label htmlFor="username-input" className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>ชื่อผู้ใช้งาน / ชื่อเซลส์ (Username)</span>
                </label>
                
                <input
                  id="username-input"
                  type="text"
                  required
                  placeholder="ระบุชื่อผู้ใช้งาน (เช่น Nalin, Phere, Bow)"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-bold transition-all"
                />
              </div>

              {/* Secure Password/PIN Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="pin-input" className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>รหัสผ่านเข้าใช้งาน (Password / PIN)</span>
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
                    💡 สำหรับการเริ่มต้นใช้งาน รหัสผ่านเริ่มต้นคือ <strong className="text-slate-800">1234</strong> หรือคุณสามารถกดแท็บ <strong className="text-blue-600">"ตั้งรหัสผ่านเข้าเอง"</strong> เพื่อกำหนดรหัสส่วนตัวได้ตามต้องการ
                  </motion.div>
                )}

                <div className="relative">
                  <input
                    id="pin-input"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="กรอกรหัสผ่านของคุณ"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setError(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 pr-10 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Success message bubble */}
              {successMsg && (
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="p-3 text-center text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between"
                >
                  <span>{successMsg}</span>
                  <button
                    type="button"
                    onClick={() => onLogin(usernameInput)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition-all"
                  >
                    เข้าสู่ระบบเลย
                  </button>
                </motion.div>
              )}

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
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>ยืนยันเข้าสู่ระบบ</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </form>
          </>
        ) : (
          /* SET / RESET PASSWORD FORM */
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4" id="reset-password-form">
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
              💡 คุณสามารถตั้งรหัสผ่านเข้าใช้งานเองได้ โดยระบุรหัสผ่านปัจจุบัน (รหัสเริ่มต้นคือ <strong className="text-slate-800">1234</strong>) แล้วกำหนดรหัสผ่านใหม่
            </div>

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>ชื่อผู้ใช้งานที่ต้องการเปลี่ยนรหัสผ่าน (Username)</span>
              </label>
              <input
                type="text"
                required
                placeholder="ระบุชื่อผู้ใช้งาน (เช่น Nalin, Phere)"
                value={resetUsername}
                onChange={(e) => {
                  setResetUsername(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-bold"
              />
            </div>

            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>รหัสผ่านเดิม (ค่าเริ่มต้นคือ 1234)</span>
              </label>
              <input
                type="password"
                required
                placeholder="กรอกรหัสผ่านเดิม"
                value={currentPass}
                onChange={(e) => {
                  setCurrentPass(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>รหัสผ่านใหม่ที่ต้องการตั้ง</span>
              </label>
              <input
                type="password"
                required
                placeholder="ระบุรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
              />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-slate-400" />
                <span>ยืนยันรหัสผ่านใหม่อีกครั้ง</span>
              </label>
              <input
                type="password"
                required
                placeholder="ยืนยันรหัสผ่านใหม่"
                value={confirmPass}
                onChange={(e) => {
                  setConfirmPass(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
              />
            </div>

            {/* Success message */}
            {successMsg && (
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="p-3 text-center text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col gap-2"
              >
                <span>✅ {successMsg}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setSuccessMsg(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  กลับหน้าเข้าสู่ระบบและล็อกอิน
                </button>
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="p-2.5 text-center text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg"
              >
                {error}
              </motion.div>
            )}

            {/* Save Password Button */}
            <button
              type="submit"
              disabled={isSubmittingReset}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmittingReset ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกรหัสผ่าน...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>บันทึกรหัสผ่านใหม่</span>
                </>
              )}
            </button>

          </form>
        )}
      </motion.div>

      {/* Security notice footer */}
      <p className="text-[10px] text-slate-400 mt-6 font-medium tracking-wide">
        ระบบบันทึกความปลอดภัยด้วยเทคโนโลยี SSL & Mylogiz Cloud Storage • สงวนลิขสิทธิ์ 2569
      </p>
    </div>
  );
}

