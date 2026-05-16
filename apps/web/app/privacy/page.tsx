import { AppShell } from '../components/app-shell';

export default function PrivacyPage() {
  return (
    <AppShell active="">
      <div className="privacy-page">
        <h1>Privacy Policy</h1>
        <p className="privacy-updated">Last updated: May 16, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Storycraft (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides AI-generated
            Russian children&apos;s books in PDF format. This Privacy Policy explains how we
            collect, use, and protect your personal information.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Account Information</h3>
          <p>
            When you sign in with Google, we collect your email address, name, and
            avatar URL from your Google account.
          </p>

          <h3>2.2 Child Profiles</h3>
          <p>
            You may create child profiles containing a name, birth date, and interests.
            This information is used solely to personalize generated book content.
          </p>

          <h3>2.3 Generated Content</h3>
          <p>
            We store the books, illustrations, and PDFs generated through our service.
          </p>

          <h3>2.4 Usage Data</h3>
          <p>
            We track generation job status, completion rates, and error logs for
            operational purposes.
          </p>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>Provide and maintain the Storycraft service</li>
            <li>Generate personalized children&apos;s books based on child profiles</li>
            <li>Monitor service performance and fix errors</li>
            <li>Enforce free-plan usage limits</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Storage and Security</h2>
          <p>
            Your data is stored in a PostgreSQL database and generated illustrations
            are stored in S3-compatible object storage. We use signed URLs to control
            access to stored files. Session authentication is managed via encrypted
            JWT tokens stored in httpOnly cookies.
          </p>
        </section>

        <section>
          <h2>5. Third-Party Services</h2>
          <p>
            We use the following third-party services:
          </p>
          <ul>
            <li><strong>Google OAuth</strong> — for authentication (subject to Google&apos;s privacy policy)</li>
            <li><strong>OpenAI API</strong> — for text and image generation (subject to OpenAI&apos;s privacy policy)</li>
          </ul>
          <p>
            Child profile data (name, age, interests) is sent to AI providers as part
            of generation prompts. We do not share your email or other account details
            with AI providers.
          </p>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <p>
            We retain your account data and generated content for as long as your
            account is active. You may request deletion of your data at any time.
          </p>
        </section>

        <section>
          <h2>7. Children&apos;s Privacy</h2>
          <p>
            Storycraft is designed for parents to create books for their children.
            We do not knowingly collect personal information directly from children
            under 13. All child profile data is entered by a parent or guardian.
          </p>
        </section>

        <section>
          <h2>8. Your Rights</h2>
          <p>
            You have the right to:
          </p>
          <ul>
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Export your generated books and data</li>
          </ul>
        </section>

        <section>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated revision date.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at
            the support email associated with this service.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
