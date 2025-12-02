"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import type { Me, ChannelWithUnread } from "../types";
import { usePresence } from "../hooks/usePresence";
import { Search, Menu, ChevronDown } from "lucide-react";

type DmPeer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  isIdle: boolean;
  statusText: string;
};

type Props = {
  user: Me;
  activeChannel: ChannelWithUnread | undefined;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  avatarUploading: boolean;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onLogout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  dmPeer?: DmPeer | null;
  onEnableNotifications: () => void;
  onOpenSearch: () => void;
};

export function ChatHeader({
  user,
  activeChannel,
  fileInputRef,
  avatarUploading,
  onAvatarChange,
  onRemoveAvatar,
  onLogout,
  sidebarOpen,
  setSidebarOpen,
  dmPeer,
  onEnableNotifications,
  onOpenSearch,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { online } = usePresence(user.sub);

  const mePresence = online.find((u) => u.id === user.sub);

  const myStatus = mePresence
    ? {
        isOnline: true,
        isIdle: mePresence.status === "idle",
      }
    : {
        isOnline: false,
        isIdle: false,
      };

  function toggleMenu() {
    setMenuOpen((v) => !v);
  }

  function handleChangeAvatar() {
    fileInputRef.current?.click();
    setMenuOpen(false);
  }

  function handleRemoveAvatar() {
    onRemoveAvatar();
    setMenuOpen(false);
  }

  function handleEnableNotificationsClick() {
    onEnableNotifications();
    setMenuOpen(false);
  }

  function handleLogoutClick() {
    onLogout();
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const root = menuRef.current;
      if (!root) return;

      const target = event.target as Node | null;
      if (target && !root.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <header className="border-b bg-neutral-200 px-3 md:px-4 py-2 flex items-center justify-between">
      {/* Left side: channel / DM info */}
      <div className="flex items-center gap-2 text-base font-semibold min-w-0">
        {/* mobile menu-button */}
        <button
          type="button"
          className="md:hidden mr-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} className="text-gray-700" />
        </button>

        {activeChannel?.isDirect && dmPeer ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <Avatar
                name={dmPeer.displayName}
                avatarUrl={dmPeer.avatarUrl}
                size={32}
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white ${
                  dmPeer.isOnline
                    ? dmPeer.isIdle
                      ? "bg-yellow-400"
                      : "bg-green-500"
                    : "bg-gray-300"
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="font-semibold truncate">{dmPeer.displayName}</div>
              <div className="text-xs text-gray-500 truncate">
                {dmPeer.statusText}
              </div>
            </div>
          </div>
        ) : (
          <>
            <span aria-hidden className="hidden sm:inline">
              #
            </span>
            <span className="truncate max-w-[60vw] md:max-w-none">
              {activeChannel?.name ?? "Chat"}
            </span>
          </>
        )}
      </div>

      {/* Right side: search + avatar + dropdown */}
      <div className="flex items-center gap-2">
        {/* search icon button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
          aria-label="Search"
        >
          <Search size={18} strokeWidth={2} />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative flex items-center">
          {/* hidden file input for avatar upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />

          <button
            type="button"
            className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-gray-100"
            onClick={toggleMenu}
            disabled={avatarUploading}
          >
            <div className="relative">
              <Avatar
                name={user.displayName}
                avatarUrl={user.avatarUrl}
                size={28}
              />

              {/* statusdot for yourself */}
              <span
                className={`
        absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white
        ${
          myStatus.isOnline
            ? myStatus.isIdle
              ? "bg-yellow-400"
              : "bg-green-500"
            : "bg-gray-300"
        }
      `}
              />
            </div>

            <span className="hidden sm:inline text-sm text-gray-700">
              {avatarUploading ? "Uploading..." : user.displayName}
            </span>

            <ChevronDown size={16} className="text-gray-500" />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-white shadow-md text-sm z-20"
            >
              <div className="px-3 py-2 border-b">
                <div className="text-xs text-gray-500">Signed in as</div>
                <div className="font-medium truncate">{user.displayName}</div>
              </div>

              <button
                type="button"
                onClick={handleChangeAvatar}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs text-gray-700"
              >
                Change avatar
              </button>

              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs text-gray-600"
              >
                Remove avatar
              </button>

              <button
                type="button"
                onClick={handleEnableNotificationsClick}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs text-gray-700"
              >
                Enable notifications
              </button>

              <button
                type="button"
                onClick={handleLogoutClick}
                className="w-full text-left px-3 py-2 hover:bg-red-50 text-xs text-red-600 border-t"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
