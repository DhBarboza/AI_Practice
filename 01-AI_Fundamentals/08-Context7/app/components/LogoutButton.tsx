"use client";
import { authClient } from "@/lib/auth-client";

export default function LogoutButton() {
    return (
        <button
            type="button"
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 text-gray-700"
            onClick={async () => {
                await authClient.signOut();
                window.location.reload();
            }}
        >
            Sair
        </button>
    );
}
