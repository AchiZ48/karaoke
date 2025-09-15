"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
// Navbar is now in layout
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
    <main>
      <div className="container mx-auto p-4 max-w-3xl min-h-screen">
        <h1 className="text-2xl font-semibold mb-4">My Profile</h1>
        {/* notifications moved to global toasts */}

        {!editing ? (
          <div className="space-y-3 mb-8">
            <div>
              <div className="text-sm text-gray-500">Name</div>
              <div className="text-base">{form.name || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Email</div>
              <div className="text-base">{form.email || "-"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Phone</div>
              <div className="text-base">{form.phone || "-"}</div>
            </div>
            <button
              className="bg-black text-white px-4 py-2 rounded"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </div>
        ) : (
          <form onSubmit={saveProfile} className="space-y-3 mb-8">
            <div>
              <label className="block mb-1">Name</label>
              <input
                className="w-full border rounded p-2 bg-white text-black"
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block mb-1">Email</label>
              <input
                className="w-full border rounded p-2 bg-gray-100 text-black"
                value={form.email ?? ""}
                readOnly
              />
            </div>
            <div>
              <label className="block mb-1">Phone</label>
              <input
                className="w-full border rounded p-2 bg-white text-black"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                className="bg-black text-white px-4 py-2 rounded"
                type="submit"
              >
                Save
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded border"
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

        <h2 className="text-xl font-semibold mb-2">Change Password</h2>
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={() => setShowPwdModal(true)}
        >
          Open Change Password
        </button>

        {showPwdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowPwdModal(false)}
            />
            <div className="relative bg-white text-black rounded-lg p-4 w-full max-w-md shadow-xl">
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
                    className="bg-black text-white px-4 py-2 rounded"
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
