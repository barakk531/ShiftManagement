import { Form, Link, useSearchParams, useActionData, useNavigation} from 'react-router-dom';
import PasswordResetModal from "../components/PasswordResetModal";
import { useState } from 'react';
import classes from './AuthForm.module.css';

function AuthForm() {
  const data = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isLogin = searchParams.get('mode') === 'login';
  const isSubmitting = navigation.state === 'submitting';
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // const mode = searchParams.get('mode') || 'login';
  // const isLogin = mode === 'login';

  return (
    <>
      <Form method="post" className={classes.form}>
        <h1>{isLogin ? 'Log in' : 'Create a new user'}</h1>
        {data && data.errors && (
          <ul>
            {Object.values(data.errors).map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        {data && data.message && <p>{data.message}</p>}
        <p>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" required />
        </p>
        <div>
          <label htmlFor="image">Password</label>
          <input id="password" type="password" name="password" required />
        <div className={classes.forgotRow}>
          <button
            type="button"
            className={classes.forgotLink}
            onClick={() => setResetOpen(true)}
          >
            Forgot password?
          </button>
      </div>
        </div>
        <div className={classes.actions}>
          {isLogin ? (
            <Link to="/create-account">Create new user</Link>
          ) : (
            <Link to="/auth?mode=login">Login</Link>
          )}
          
          {/* <Link to={`?mode=${isLogin ? 'signup' : 'login'}`}>
            {isLogin ? 'Create new user' : 'Login'}
          </Link> */}
          <button disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Save'}</button>
        </div>

        <PasswordResetModal
          open={resetOpen}
          onClose={() => setResetOpen(false)}
          onResetSuccess={() => {}}
        />


      </Form>
    </>
  );
}

export default AuthForm;
