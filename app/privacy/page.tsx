import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Cinematch",
  description: "Privacy Policy for Cinematch app",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: January 1, 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Introduction</h2>
          <p className="text-gray-300 leading-relaxed">
            Cinematch (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, and safeguard your information when
            you use our mobile application and web service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>
          <div className="text-gray-300 leading-relaxed space-y-4">
            <div>
              <h3 className="font-medium text-white mb-2">Account Information</h3>
              <p>
                When you sign in with Google, we collect your name, email address, and profile picture
                to create and manage your account.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-white mb-2">Usage Data</h3>
              <p>
                We collect information about how you use the app, including movies you like or dismiss,
                your watchlist, and session participation data.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-white mb-2">Device Information</h3>
              <p>
                We may collect device identifiers and general device information to improve app
                performance and troubleshoot issues.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">How We Use Your Information</h2>
          <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-2">
            <li>To provide and maintain our service</li>
            <li>To personalize your movie recommendations</li>
            <li>To enable social features like friend matching and group sessions</li>
            <li>To save your watchlist and preferences</li>
            <li>To communicate with you about app updates and features</li>
            <li>To improve our app and develop new features</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Sharing</h2>
          <p className="text-gray-300 leading-relaxed">
            We do not sell your personal information. We may share your information with:
          </p>
          <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-2 mt-4">
            <li>Other users you choose to connect with (friends, session participants)</li>
            <li>Service providers who help us operate the app (hosting, analytics)</li>
            <li>Third-party movie databases (TMDB, IMDb, Rotten Tomatoes) to fetch movie information</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Security</h2>
          <p className="text-gray-300 leading-relaxed">
            We implement appropriate security measures to protect your personal information.
            Your authentication is handled securely through Google Sign-In, and sensitive data
            is encrypted in transit.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Rights</h2>
          <p className="text-gray-300 leading-relaxed">
            You have the right to:
          </p>
          <ul className="text-gray-300 leading-relaxed list-disc list-inside space-y-2 mt-4">
            <li>Access your personal data</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of non-essential communications</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Children&apos;s Privacy</h2>
          <p className="text-gray-300 leading-relaxed">
            Cinematch is not intended for children under 13. We do not knowingly collect
            personal information from children under 13. If you believe we have collected
            information from a child under 13, please contact us.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Changes to This Policy</h2>
          <p className="text-gray-300 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any
            changes by posting the new Privacy Policy on this page and updating the
            &quot;Last updated&quot; date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at:{" "}
            <a href="mailto:support@cinematch.app" className="text-emerald-400 hover:underline">
              support@cinematch.app
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
