"use client";

import { useAuth } from "@/auth";

const ProfilePage = () => {
  const { currentUser, isAuthenticated, hasRole, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return <p>Not logged in.</p>;
  }

  const roleValue = currentUser.roles;
  const emailValue = currentUser.email;

  return (
    <>
      <h1 className="text-2xl">Profile</h1>

      <table className="rw-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ID</td>
            <td>{String(currentUser.id)}</td>
          </tr>
          <tr>
            <td>ROLES</td>
            <td>{typeof roleValue === "string" ? roleValue : JSON.stringify(roleValue ?? "")}</td>
          </tr>
          <tr>
            <td>EMAIL</td>
            <td>
              {typeof emailValue === "string" ? emailValue : JSON.stringify(emailValue ?? "")}
            </td>
          </tr>

          <tr key="isAuthenticated">
            <td>isAuthenticated</td>
            <td>{JSON.stringify(isAuthenticated)}</td>
          </tr>

          <tr key="hasRole">
            <td>Is Admin</td>
            <td>{JSON.stringify(hasRole("ADMIN"))}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default ProfilePage;
