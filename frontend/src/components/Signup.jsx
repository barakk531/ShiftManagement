import {isEmail, isNotEmpty, isEqualToOtherValue, hasMinLength} from '../util/validation';
import { useActionState } from 'react';
import './Signup.css';



  async function signupAction(prevFormState, formData) {
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm-password');
    const firstName = formData.get('first-name');
    const lastName = formData.get('last-name');
    const role = formData.get('role');
    const terms = formData.get('terms');
    const acquisitionChannel = formData.getAll('acquisition');

    let errors = [];

    if (!isEmail(email)) {
      errors.push('Invalid email address.');
    }

    if (!isNotEmpty(password) || !hasMinLength(password, 8)) {
      errors.push('You must provide a password with at least six characters.');
    }

    if (!isEqualToOtherValue(password, confirmPassword)) {
      errors.push('Password do not match.');
    }

    if (!isNotEmpty(firstName) || !isNotEmpty(lastName)) {
      errors.push('Please provide both your first and last name.')
    }

    if (!isNotEmpty(role)) {
      errors.push('Please select a role.');
    }

    if (!terms) {
      errors.push('You must agree to the terms and conditions.')
    }

    if (acquisitionChannel.length === 0) {
      errors.push('Please select at least one acquisition channel.');
    }

    if (errors.length > 0) {
      return {
        errors, 
        enteredValues: {
          email,
          password,
          confirmPassword,
          firstName,
          lastName,
          role,
          acquisitionChannel,
          terms,
        },
      };
    }

    try {
      const response = await fetch('http://127.0.0.1:8080/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          'first-name': firstName,
          'last-name': lastName,
          role,
          terms: terms ? 1 : 0,
          acquisition: acquisitionChannel,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        const serverErrors = [];

        if (resData?.errors?.email) serverErrors.push(resData.errors.email);
        if (resData?.errors?.password) serverErrors.push(resData.errors.password);

        if (serverErrors.length === 0 && resData?.message) serverErrors.push(resData.message);

        return {
          errors: serverErrors.length ? serverErrors : ['Signup failed.'],
          enteredValues: {
            email,
            password,
            confirmPassword,
            firstName,
            lastName,
            role,
            acquisitionChannel,
            terms,
          },
        };
      }

      const token = resData?.token;
      if (token) {
        localStorage.setItem('token', token);

        const expiration = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        localStorage.setItem('expiration', expiration);
      }

      return { errors: null, success: true };
    } catch (err) {
      return {
        errors: ['Network error: could not reach backend.'],
        enteredValues: {
          email,
          password,
          confirmPassword,
          firstName,
          lastName,
          role,
          acquisitionChannel,
          terms,
        },
      };
    }
 }


export default function Signup() {
  const [formState, formAction] = useActionState(signupAction, { errors: null,});

  return (
    <div className="signup">
        <form action={formAction}>
        <h2>Welcome on board!</h2>
        <p>We just need a little bit of data from you to get you started 🚀</p>

        <div className="control">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" defaultValue={formState.enteredValues?.email} />
        </div>

        <div className="control-row">
            <div className="control">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" defaultValue={formState.enteredValues?.password}/>
            </div>

            <div className="control">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
                id="confirm-password"
                type="password"
                name="confirm-password"
                defaultValue={formState.enteredValues?.confirmPassword}
            />
            </div>
        </div>

        <hr />

        <div className="control-row">
            <div className="control">
            <label htmlFor="first-name">First Name</label>
            <input type="text" id="first-name" name="first-name" defaultValue={formState.enteredValues?.firstName}/>
            </div>

            <div className="control">
            <label htmlFor="last-name">Last Name</label>
            <input type="text" id="last-name" name="last-name" defaultValue={formState.enteredValues?.lastName}/>
            </div>
        </div>

        <div className="control">
            <label htmlFor="phone">What best describes your role?</label>
            <select id="role" name="role" defaultValue={formState.enteredValues?.role}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="employee">Employee</option>
            <option value="founder">Founder</option>
            <option value="other">Other</option>
            </select>
        </div>

        <fieldset>
            <legend>How did you find us?</legend>
            <div className="control">
            <input
                type="checkbox"
                id="google"
                name="acquisition"
                value="google"
                // defaultChecked={formState.enteredValues?acquisitionChannel.includes('google')} - not working 271
            />
            <label htmlFor="google">Google</label>
            </div>

            <div className="control">
            <input
                type="checkbox"
                id="friend"
                name="acquisition"
                value="friend"
                // defaultChecked={formState.enteredValues?acquisitionChannel.includes('friend')} - not working 271
            />
            <label htmlFor="friend">Referred by friend</label>
            </div>

            <div className="control">
            <input type="checkbox" id="other" name="acquisition" value="other" 
                // defaultChecked={formState.enteredValues?acquisitionChannel.includes('other')} - not working 271
            />
            <label htmlFor="other">Other</label>
            </div>
        </fieldset>

        <div className="control">
            <label htmlFor="terms-and-conditions">
            <input type="checkbox" id="terms-and-conditions" name="terms" 
                defaultChecked={formState.enteredValues?.terms}
            />I agree to the terms and conditions
            </label>
        </div>

        {formState.errors && (<ul className='error'>
            {formState.errors.map((error) => (<li key={error}>{error}</li>))}
            </ul>)}

        {formState.success && (
        <p className="success">
            Signup successful! You can now continue.
        </p>
        )}



        <p className="form-actions">
            <button type="reset" className="button button-flat">
            Reset
            </button>
            <button className="button">Sign up</button>
        </p>
        </form>
    </div>
  );
}
