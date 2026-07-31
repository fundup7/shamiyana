"use client";
import React from "react";

export interface ModalProps {
  isOpen: boolean;
  type?: "success" | "error" | "info" | "confirm";
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export default function MessageModal({
  isOpen,
  type = "info",
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onClose,
}: ModalProps) {
  if (!isOpen) return null;

  const typeStyles = {
    success: {
      badgeBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      icon: (
        <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ),
      btnBg: "bg-[#F59032] hover:bg-[#E88022] text-white",
    },
    error: {
      badgeBg: "bg-red-50 text-red-600 border-red-100",
      icon: (
        <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
      btnBg: "bg-red-500 hover:bg-red-600 text-white",
    },
    confirm: {
      badgeBg: "bg-amber-50 text-amber-600 border-amber-100",
      icon: (
        <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
      ),
      btnBg: "bg-red-500 hover:bg-red-600 text-white",
    },
    info: {
      badgeBg: "bg-orange-50 text-[#F59032] border-orange-100",
      icon: (
        <svg className="w-7 h-7 text-[#F59032]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
      btnBg: "bg-[#F59032] hover:bg-[#E88022] text-white",
    },
  };

  const style = typeStyles[type] || typeStyles.info;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 z-10 text-center animate-in zoom-in-95 duration-200">
        {/* Icon Header */}
        <div className={`w-14 h-14 rounded-2xl ${style.badgeBg} border flex items-center justify-center mx-auto mb-4 shadow-sm`}>
          {style.icon}
        </div>

        {/* Content */}
        <h3 className="text-[19px] font-bold text-[#1A1A1A] mb-1.5 leading-snug">{title}</h3>
        <p className="text-[13px] text-[#777] leading-relaxed mb-6 px-1">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          {type === "confirm" ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-[#555] font-semibold text-[14px] hover:bg-gray-50 transition active:scale-[0.97]"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-[14px] shadow-sm transition active:scale-[0.97] ${style.btnBg}`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-[14px] shadow-md transition active:scale-[0.98] ${style.btnBg}`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
