"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useToast } from "../components/toast/ToastProvider";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [original, setOriginal] = useState({ name: "", email: "", phone: "" });
  const [editing, setEditing] = useState(false);
  const [pwd, setPwd] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPwdModal, setShowPwdModal] = useState(false);
  const { showToast } = useToast();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => {
          if (d?.user) {
            setForm({
              name: d.user.name ?? "",
              email: d.user.email ?? "",
              phone: d.user.phone ?? "",
            });
            setOriginal({
              name: d.user.name ?? "",
              email: d.user.email ?? "",
              phone: d.user.phone ?? "",
            });
          }
        });
    }
  }, [status]);

  if (status === "unauthenticated") redirect("/login?callbackUrl=/profile");

  async function saveProfile(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, phone: form.phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data?.message || "Failed");
      showToast(data?.message || "Update failed", "error");
    } else {
      setMsg("Profile updated");
      showToast("Profile updated", "success");
      setOriginal(form);
      setEditing(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    if (!pwd.newPassword || pwd.newPassword !== pwd.confirmNewPassword) {
      setErr("New passwords do not match");
      showToast("New passwords do not match", "error");
      return;
    }
    const payload = {
      currentPassword: pwd.currentPassword,
      newPassword: pwd.newPassword,
    };
    const res = await fetch("/api/profile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data?.message || "Failed");
      showToast(data?.message || "Change failed", "error");
    } else {
      setMsg("Password changed");
      showToast("Password changed", "success");
      setPwd({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setShowPwdModal(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8f8fa]">
      <div
        className="w-full mx-auto max-w-xl rounded-2xl shadow-lg bg-[#f3f3f5] p-8 relative "
        style={{ boxShadow: "4px 8px 16px #e0e0e0" }}
      >
        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-gray-300 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
            {/* Profile image placeholder */}
            <svg
              width="48"
              height="48"
              fill="none"
              viewBox="0 0 24 24"
              className="text-gray-400"
            >
              <circle cx="12" cy="8" r="4" fill="#e0e0e0" />
              <rect x="4" y="16" width="16" height="6" rx="3" fill="#e0e0e0" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-black">
              {form.name || "-"}
            </div>
            <div className="text-base text-gray-600">{form.email || "-"}</div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="divide-y divide-gray-300 bg-white rounded-xl overflow-hidden">
          <div className="flex items-center px-6 py-5">
            <div className="w-1/3 font-semibold text-black">Name</div>
            <div className="flex-1 text-gray-600">{form.name || "-"}</div>
          </div>
          <div className="flex items-center px-6 py-5">
            <div className="w-1/3 font-semibold text-black">Email account</div>
            <div className="flex-1 text-gray-600">{form.email || "-"}</div>
          </div>
          <div className="flex items-center px-6 py-5">
            <div className="w-1/3 font-semibold text-black">Phone number</div>
            <div className="flex-1 text-gray-600">{form.phone || "-"}</div>
          </div>
          <div className="flex items-center px-6 py-5">
            <div className="w-1/3 font-semibold text-black">Password</div>
            <div className="flex-1 flex flex-col items-end">
              <span className="tracking-widest text-lg text-gray-600">
                **********
              </span>
              <button
                className="text-xs text-[#5b5b8c] underline mt-1"
                onClick={() => setShowPwdModal(true)}
              >
                Change password ?
              </button>
            </div>
          </div>
        </div>

        {/* Edit/Save/Cancel Button */}
        {!editing ? (
          <div className="flex justify-end mt-8">
            <button
              className="bg-gradient-to-r from-[#6d6dc9] to-[#2e2e5e] text-white px-8 py-2 rounded-lg font-semibold shadow"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </div>
        ) : (
          <form onSubmit={saveProfile} className="mt-8 space-y-4">
            <div>
              <label className="block mb-1 font-semibold text-black">
                Name
              </label>
              <input
                className="w-full border rounded p-2 bg-white text-black"
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-black">
                Email
              </label>
              <input
                className="w-full border rounded p-2 bg-gray-100 text-black"
                value={form.email ?? ""}
                readOnly
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-black">
                Phone
              </label>
              <input
                className="w-full border rounded p-2 bg-white text-black"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="bg-gradient-to-r from-[#6d6dc9] to-[#2e2e5e] text-white px-8 py-2 rounded-lg font-semibold shadow"
                type="submit"
              >
                Save
              </button>
              <button
                type="button"
                className="px-8 py-2 rounded-lg border font-semibold text-black"
                onClick={() => {
                  setForm(original);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Close Button */}
        {!editing && (
          <div className="flex justify-center mt-8">
            <button
              className="w-48 bg-gradient-to-r from-[#6d6dc9] to-[#2e2e5e] text-white py-2 rounded-lg font-semibold shadow"
              onClick={() => redirect("/")}
            >
              Close
            </button>
          </div>
        )}

        {/* Change Password Modal */}
        {showPwdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowPwdModal(false)}
            />
            <div className="relative bg-white text-black rounded-lg p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Change Password</div>
                <button
                  className="text-sm underline"
                  onClick={() => setShowPwdModal(false)}
                >
                  Close
                </button>
              </div>
              <form onSubmit={changePassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  className="w-full border rounded p-2 bg-white text-black"
                  value={pwd.currentPassword}
                  onChange={(e) =>
                    setPwd({ ...pwd, currentPassword: e.target.value })
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="New password"
                  className="w-full border rounded p-2 bg-white text-black"
                  value={pwd.newPassword}
                  onChange={(e) =>
                    setPwd({ ...pwd, newPassword: e.target.value })
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full border rounded p-2 bg-white text-black"
                  value={pwd.confirmNewPassword}
                  onChange={(e) =>
                    setPwd({ ...pwd, confirmNewPassword: e.target.value })
                  }
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded border"
                    onClick={() => setShowPwdModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-gradient-to-r from-[#6d6dc9] to-[#2e2e5e] text-white px-4 py-2 rounded"
                    type="submit"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
