
import { Form, useNavigate, useNavigation, useActionData, redirect } from 'react-router-dom';
import classes from './EventForm.module.css';
import { getAuthToken } from '../util/auth';
import { useMemo, useState } from 'react';

// Common Israeli cities for quick selection
const ISRAEL_CITIES = [
  'Tel Aviv',
  'Jerusalem',
  'Haifa',
  'Rishon LeZion',
  'Petah Tikva',
  'Ashdod',
  'Netanya',
  'Beersheba',
  'Ramat Gan',
  'Herzliya',
  'Holon',
  'Rehovot',
  'Bat Yam',
  'Kfar Saba',
  'Modiin-Maccabim-Reut',
  'Eilat',
  'Tiberias',
  'Raanana',
];

// Returns day-of-week in English based on YYYY-MM-DD
function getDayOfWeekEnglish(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return Number.isNaN(d.getTime()) ? '' : days[d.getDay()];
}

// Calculates hours worked from HH:MM -> HH:MM (supports overnight shifts)
function calcHoursWorked(startTime, endTime) {
  if (!startTime || !endTime) return 0;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  // Handle shifts that pass midnight
  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60;

  const hours = diff / 60;
  return Math.round(hours * 100) / 100;
}

// Calculates total pay for the shift
function calcShiftTotal(hoursWorked, hourlyRate, travel) {
  const rate = Number(hourlyRate) || 0;
  const travelAmount = Number(travel) || 0;
  const total = hoursWorked * rate + travelAmount;
  return Math.round(total * 100) / 100;
}


function buildHourlyRateOptions(min = 35, max = 100, step = 5) {
  const values = [];
  for (let v = min; v <= max; v += step) values.push(v);
  return values;
}

function EventForm({ method, event }) {
  const data = useActionData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  // Controlled shift fields for live calculations
  const [workDate, setWorkDate] = useState(event?.date ?? '');
  const [city, setCity] = useState(event?.city ?? '');
  const [startTime, setStartTime] = useState(event?.startTime ?? '');
  const [endTime, setEndTime] = useState(event?.endTime ?? '');
  const [hourlyRate, setHourlyRate] = useState(String(event?.hourlyRate ?? 35));
  const [travel, setTravel] = useState(String(event?.travel ?? 0));

  // Live derived values
  const dayOfWeek = useMemo(() => getDayOfWeekEnglish(workDate), [workDate]);
  const hoursWorked = useMemo(() => calcHoursWorked(startTime, endTime), [startTime, endTime]);
  const shiftTotal = useMemo(() => calcShiftTotal(hoursWorked, hourlyRate, travel),[hoursWorked, hourlyRate, travel]);

  function cancelHandler() {
    navigate('..');
  }

  return (
    <Form method={method} className={classes.form}>
      {data && data.errors && (
        <ul>
          {Object.values(data.errors).map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      {/* Existing fields (kept as-is) */}
      <p>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          name="title"
          required
          defaultValue={event?.title ?? ''}
        />
      </p>

      <p>
        <label htmlFor="image">Image URL</label>
        <input
          id="image"
          type="url"
          name="image"
          required
          defaultValue={event?.image ?? ''}
        />
      </p>

      <p>
        <label htmlFor="date">Work Date</label>
        <input
          id="date"
          type="date"
          name="date"
          required
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
        />
      </p>



      {/* New shift fields (controlled for live calculations) */}
      <p>
        <label htmlFor="city">City</label>
        <input
          id="city"
          name="city"
          list="israel-cities"
          placeholder="Select or type a city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <datalist id="israel-cities">
          {ISRAEL_CITIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </p>

      <p>
        <label htmlFor="startTime">Start Time</label>
        <input
          id="startTime"
          name="startTime"
          type="time"
          lang="en-GB"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </p>

      <p>
        <label htmlFor="endTime">End Time</label>
        <input
          id="endTime"
          name="endTime"
          type="time"
          lang="en-GB"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </p>

      <p>
        <label htmlFor="hourlyRate">Hourly Rate (ILS)</label>
        <select
          id="hourlyRate"
          name="hourlyRate"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
        >
          {buildHourlyRateOptions(35, 100, 5).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </p>
      <p>
        <label htmlFor="travel">Travel (ILS)</label>
        <select
          id="travel"
          name="travel"
          value={travel}
          onChange={(e) => setTravel(e.target.value)}
        >
          {[0, 20, 30, 40, 50, 60, 70, 80].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </p>
      {/* Live summary */}
      <div style={{ marginTop: '1rem' }}>
        <p>
          Day of Week: <strong>{dayOfWeek || '-'}</strong>
        </p>
        <p>
          Total Hours: <strong>{hoursWorked}</strong>
        </p>
        <p>
          Travel (ILS): <strong>{Number(travel) || 0}</strong>
        </p>
        <p>
          Shift Total (ILS): <strong>{shiftTotal}</strong>
        </p>
      </div>
      <p>
        <label htmlFor="description">Description / Notes</label>
        <textarea
          id="description"
          name="description"
          rows="5"
          required
          defaultValue={event?.description ?? ''}
        />
      </p>
      <div className={classes.actions}>
        <button type="button" onClick={cancelHandler} disabled={isSubmitting}>
          Cancel
        </button>
        <button disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Save'}</button>
      </div>
    </Form>
  );
}

export default EventForm;

export async function action({ request, params }) {
  const method = request.method;
  const data = await request.formData();

  const title = data.get('title');
  const image = data.get('image');
  const date = data.get('date');
  const description = data.get('description');

  const city = data.get('city') || '';
  const startTime = data.get('startTime') || '';
  const endTime = data.get('endTime') || '';
  const hourlyRate = Number(data.get('hourlyRate') || 0);
  const travel = Number(data.get('travel') || 0);

  // Recompute derived values in the action for consistency
  const dayOfWeek = getDayOfWeekEnglish(date);
  const hoursWorked = calcHoursWorked(startTime, endTime);
  const shiftTotal = calcShiftTotal(hoursWorked, hourlyRate, travel);

  const eventData = {
    title,
    image,
    date,
    description,

    city,
    startTime,
    endTime,
    hourlyRate,
    travel,

    dayOfWeek,
    hoursWorked,
    shiftTotal,
  };

  const token = getAuthToken();

  const url =
    method === 'PATCH'
      ? `http://localhost:8080/events/${params.eventId}`
      : 'http://localhost:8080/events';

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(eventData),
  });

  if (response.status === 422 || response.status === 401) {
    return response;
  }

  if (!response.ok) {
    throw new Response(JSON.stringify({ message: 'Could not save shift.' }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect('/events');
}
