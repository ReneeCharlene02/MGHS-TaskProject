'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { fetchUserDetails, updateUserDetails } from '@/app/services/UserService';
import { fetchAttendance, Attendance, updateAttendance, deleteAttendance } from '@/app/services/AttendanceService';
import { UserDetails } from '@/types/user-details';
import { toast } from 'sonner';
import HamburgerMenu from '@/app/components/HamburgerMenu';
import AttendanceModal from './modals/AttendanceModal';
import OvertimeModal from './modals/OvertimeModal';
import styles from './dashboard.module.css';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { Timestamp } from 'firebase/firestore';
import { Overtime } from '@/app/services/OvertimeService';
import InternProtectedRoute from '@/app/components/InternProtectedRoute';

export default function Dashboard() {
  const session = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/signin');
    },
  });

  const router = useRouter();

  const [internName, setInternName] = useState('');
  const [attendancePopup, setAttendancePopup] = useState(false);
  const [overtimePopup, setOvertimePopup] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [key: string]: any }[]>([]);
  const [currentRecord, setCurrentRecord] = useState<Attendance | null>(null);
  const [currentOTRecord, setCurrentOTRecord] = useState<Overtime | null>(null);
  const [totalRenderedHours, setTotalRenderedHours] = useState<number>(0);

  useEffect(() => {
    const getInternName = async () => {
      const email = session.data?.user?.email;

      if (!email) {
        toast.error('Email is not available');
        return;
      }
      try {
        const userDetails: UserDetails[] = await fetchUserDetails(email);
        if (userDetails.length > 0) {
          const user = userDetails[0] as UserDetails;
          setInternName(user.firstname);
        } else {
          toast.error('User not found');
        }
      } catch (error) {
        toast.error('An error occurred while fetching user details');
        console.error(error);
      }
    };

    getInternName();
  }, [session]);

  const getAttendanceRecords = useCallback(async () => {
    if (session.data?.user?.email) {
      try {
        const attendanceData = await fetchAttendance(session.data.user.email);
        console.log('Fetched Attendance Data:', attendanceData); // Add this line
  
        const recordsWithDate = attendanceData.map(record => ({
          ...record,
          attendanceDate: record.attendanceDate instanceof Timestamp ? record.attendanceDate.toDate() : record.attendanceDate,
        }));
        
        // Calculate total rendered hours
        const totalHours = recordsWithDate.reduce((sum, record) => sum + (record.renderedHours || 0), 0);
        setTotalRenderedHours(totalHours);
        setAttendanceRecords(recordsWithDate);
  
        // Fetch user details to update
        const userDetails: UserDetails[] = await fetchUserDetails(session.data.user.email);
        if (userDetails.length > 0) {
          const user = userDetails[0] as UserDetails;
          // Update user details with the total rendered hours
          const updatedUserDetails: UserDetails = {
            ...user,
              totalHoursRendered: totalHours, // update the field as per your structure
          };
          await updateUserDetails(user.id!, updatedUserDetails);
        }
      } catch (error) {
        toast.error('An error occurred while fetching attendance records or updating user details');
        console.error(error);
      }
    }
  }, [session]);
  
  useEffect(() => {
    getAttendanceRecords();
  }, [session, getAttendanceRecords]);  

  const handleAttendanceEdit = (record: any) => {
    setCurrentRecord(record);
    setAttendancePopup(true);
    setOvertimePopup(false);
  };

  const handleAttendanceAdd = () => {
    setCurrentRecord(null);
    setAttendancePopup(true);
    setOvertimePopup(false);
  };

  const handleAddOT = () => {
    setCurrentOTRecord(null);
    setAttendancePopup(false);
    setOvertimePopup(true);
  };

  const handleAttPopupClose = () => {
    setAttendancePopup(false);
    getAttendanceRecords();
  };
  
  const handleOTPopupClose = () => {
    setOvertimePopup(false);
  };

  const handleOTAddSuccess = () => {
    router.push('/intern/overtime-reports');
  };

  const handleDelete = async (id: string) => {
    const confirmation = window.confirm("Are you sure you want to delete this Attendance?");
    if (confirmation) {
    try {
      await deleteAttendance(id);
      setAttendanceRecords(attendanceRecords.filter(record => record.id !== id));
      getAttendanceRecords();
      toast.success('Attendance record deleted successfully');
    } catch (error) {
      toast.error('An error occurred while deleting the attendance record');
      console.error(error);
    }}
  };

  return (
    <InternProtectedRoute>
    <div className={styles.container}>
      <HamburgerMenu internName={internName} />
      <main className={styles.content}>
        <h1 className={styles.dashboardh1}>Dashboard</h1>
        <div className={styles.squareContainer}>
            <button className={`${styles.overtimeBtn} ${styles.dashboardbutton}`} 
            onClick={handleAttendanceAdd}>
                Render Attendance
            </button>
            <button className={`${styles.overtimeBtn} ${styles.dashboardbutton}`} 
            onClick={handleAddOT}>
                Render Overtime
            </button>
        </div>
        <center>
        <div className={styles.totalHoursContainer}>
            <h3 className={styles.totalHoursHeader}>Total Rendered Hours</h3>
            <p className={styles.totalHoursValue}>{totalRenderedHours} hours</p>
        </div>
        </center>
        <table className={styles.attendanceTable}>
  <thead>
    <tr>
      <th colSpan={5} className={styles.tableHeader}>Overview of Attendance</th>
    </tr>
    <tr>
      <th className={styles.attendanceTableth}>Date</th>
      <th className={styles.attendanceTableth}>Clock In</th>
      <th className={styles.attendanceTableth}>Clock Out</th>
      <th className={styles.attendanceTableth}>Total Hours Rendered</th>
      <th className={styles.attendanceTableth}>Actions</th>
    </tr>
  </thead>
    <tbody>
        {attendanceRecords.length === 0 ? (
        <tr>
            <td colSpan={5} className={styles.noRecords}>No Recorded Attendance</td>
        </tr>
        ) : (
        attendanceRecords.map((record) => (
            <tr key={record.id}>
            <td className={styles.attendanceTabletd}>
                {new Date(record.attendanceDate).toLocaleDateString()}
            </td>
            <td className={styles.attendanceTabletd}>{record.timeStart}</td>
            <td className={styles.attendanceTabletd}>{record.timeEnd}</td>
            <td className={styles.attendanceTabletd}>{record.renderedHours}</td>
            <td className={styles.attendanceTabletd}>
                <button 
                    className={`${styles.actionButton} ${styles.editButton}`} 
                    onClick={() => handleAttendanceEdit(record)}
                >
                    <FaEdit />
                </button>
                <button 
                    className={`${styles.actionButton} ${styles.trashButton}`} 
                    onClick={() => handleDelete(record.id)}
                >
                    <FaTrash />
                </button>
            </td>
            </tr>
        ))
        )}
    </tbody>
    </table>
      </main>

      {/* Attendance Modal */}
      <AttendanceModal 
        isVisible={attendancePopup} 
        setModalState={handleAttPopupClose}
        initialRecord={currentRecord || undefined}
        recordID={currentRecord?.id || null}
      />

      {/* Overtime Modal */}
      <OvertimeModal 
        isVisible={overtimePopup} 
        setModalState={handleOTPopupClose}
        initialRecord={undefined}
        recordID={null}
        onAddSuccess={handleOTAddSuccess}
      />
    </div>
    </InternProtectedRoute>
  );
}
