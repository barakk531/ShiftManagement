import AccountWidget from '../components/AccountWidget';
import PageContent from '../components/PageContent';
import ReferralWidget from "../components/ReferralWidget";

const token = localStorage.getItem("token");

function NewsletterPage() {
  return (
    <PageContent title="Join our awesome App today!">
      {token && <AccountWidget />}
      <ReferralWidget />
    </PageContent>
  );
}

export default NewsletterPage;

export async function action({ request }) {
  const data = await request.formData();
  const email = data.get('email');

  // send to backend newsletter server ...
  console.log(email);
  return { message: 'Signup successful!' };
}
