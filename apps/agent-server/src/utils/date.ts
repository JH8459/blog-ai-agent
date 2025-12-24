import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST_TZ = 'Asia/Seoul';

export function getTodayDate(date: Date = new Date()): string {
  return dayjs(date).tz(KST_TZ).format('YYYY-MM-DD');
}
