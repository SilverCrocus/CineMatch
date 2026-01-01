import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account - Cinematch",
  description: "Request deletion of your Cinematch account and data",
};

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Delete Your Account</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">How to Delete Your Account</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            To delete your Cinematch account and all associated data, please follow these steps:
          </p>
          <ol className="text-gray-300 leading-relaxed list-decimal list-inside space-y-3">
            <li>Open the Cinematch app on your device</li>
            <li>Go to your Profile (tap your profile icon)</li>
            <li>Tap &quot;Settings&quot;</li>
            <li>Scroll down and tap &quot;Delete Account&quot;</li>
            <li>Confirm your decision when prompted</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">What Data Will Be Deleted</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            When you delete your account, the following data will be permanently removed:
          </p>
          <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-2">
            <li>Your profile information (name, email, profile picture)</li>
            <li>Your watchlist and saved movies</li>
            <li>Your dismissed movies history</li>
            <li>Your friend connections</li>
            <li>Your session history and swipe data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
          <p className="text-gray-300 leading-relaxed">
            Account deletion is processed immediately. All your personal data will be
            permanently deleted from our servers within 30 days of your request.
            Some anonymized, aggregated data may be retained for analytics purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Alternative: Email Request</h2>
          <p className="text-gray-300 leading-relaxed">
            If you are unable to delete your account through the app, you can email us at{" "}
            <a href="mailto:support@cinematch.app?subject=Account%20Deletion%20Request" className="text-emerald-400 hover:underline">
              support@cinematch.app
            </a>
            {" "}with the subject line &quot;Account Deletion Request&quot;. Please include the email
            address associated with your account. We will process your request within 7 business days.
          </p>
        </section>

        <section className="mb-8 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-yellow-400">Important Note</h2>
          <p className="text-gray-300 leading-relaxed">
            Account deletion is permanent and cannot be undone. You will lose access to all
            your saved movies and will need to create a new account if you wish to use
            Cinematch again in the future.
          </p>
        </section>
      </div>
    </div>
  );
}
