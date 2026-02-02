import { redirect } from 'react-router-dom';



export function getUserFullName() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const { firstName, lastName } = payload;
    if (!firstName || !lastName) return null;
    return `${firstName} ${lastName}`;
  } catch {
    return null;
  }
}



export function getTokenDuration() {
    const storedExpirationDate = localStorage.getItem('expiration');
    const expirationDate = new Date(storedExpirationDate);
    const now = new Date();
    const duration = expirationDate.getTime() - now.getTime();
    return duration;
}


export function getAuthToken() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }

  const tokenDuration = getTokenDuration();
  
  if (tokenDuration < 0) {
    return 'EXPIRED';
  }

  return token;
}

export function tokenLoader() {
  const token = getAuthToken();
  return token;
}


export function checkAuthLoader() {
  // this function will be added in the next lecture
  // make sure it looks like this in the end
  const token = getAuthToken();
  
  if (!token) {
    return redirect('/auth');
  }
 
  return null; 
}



