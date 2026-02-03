
import { useEffect } from "react";
import AccountWidget from "../components/AccountWidget";
import PageContent from "../components/PageContent";
import ReferralWidget from "../components/ReferralWidget";
import "../components/NewsletterTheme.module.css";

const token = localStorage.getItem("token");


export async function action({ request }) {
  const data = await request.formData();
  const email = data.get('email');

  // send to backend newsletter server ...
  console.log(email);
  return { message: 'Signup successful!' };
}


function NewsletterPage() {
  useEffect(() => {
    document.body.classList.add("newsletter-theme");
    return () => document.body.classList.remove("newsletter-theme");
  }, []);

  return (
    <PageContent title="Join our awesome App today!">
      {token && <AccountWidget />}
      <ReferralWidget />
    </PageContent>
  );
}

export default NewsletterPage;










// without DECORATION

// import AccountWidget from '../components/AccountWidget';
// import PageContent from '../components/PageContent';
// import ReferralWidget from "../components/ReferralWidget";

// const token = localStorage.getItem("token");

// function NewsletterPage() {
//   return (
//     <PageContent title="Join our awesome App today!">
//       {token && <AccountWidget />}
//       <ReferralWidget />
//     </PageContent>
//   );
// }

// export default NewsletterPage;

// export async function action({ request }) {
//   const data = await request.formData();
//   const email = data.get('email');

//   // send to backend newsletter server ...
//   console.log(email);
//   return { message: 'Signup successful!' };
// }


