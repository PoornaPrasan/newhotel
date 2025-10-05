import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, Reservation, Billing, Report } from '../types';

interface HotelContextType {
  rooms: Room[];
  reservations: Reservation[];
  billings: Billing[];
  reports: Report[];
  loading: boolean;
  // Room operations
  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  // Reservation operations
  addReservation: (reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReservation: (id: string, reservation: Partial<Reservation>) => void;
  cancelReservation: (id: string) => void;
  checkIn: (id: string) => void;
  checkOut: (id: string) => void;
  // Billing operations
  addBilling: (billing: Omit<Billing, 'id' | 'createdAt'>) => void;
  updateBilling: (id: string, billing: Partial<Billing>) => void;
  // Utility functions
  getAvailableRooms: (checkIn: Date, checkOut: Date) => Room[];
  getDailyReport: (date: Date) => Report | undefined;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

// Mock data for demo
const mockRooms: Room[] = [
  {
    id: '1',
    number: '101',
    type: 'standard',
    capacity: 2,
    price: 150,
    amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'],
    status: 'available',
    floor: 1,
  },
  {
    id: '2',
    number: '102',
    type: 'deluxe',
    capacity: 3,
    price: 220,
    amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Room Service'],
    status: 'available',
    floor: 1,
  },
  {
    id: '3',
    number: '201',
    type: 'suite',
    capacity: 4,
    price: 350,
    amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Room Service', 'Kitchenette'],
    status: 'occupied',
    floor: 2,
  },
  {
    id: '4',
    number: '301',
    type: 'residential',
    capacity: 6,
    price: 500,
    amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Room Service', 'Full Kitchen', 'Living Room'],
    status: 'available',
    floor: 3,
  },
];

const mockReservations: Reservation[] = [
  {
    id: '1',
    customerId: '4',
    customerName: 'John Customer',
    customerEmail: 'customer@example.com',
    customerPhone: '+1-555-0004',
    roomId: '3',
    roomNumber: '201',
    checkInDate: new Date(),
    checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    guests: 2,
    status: 'checked-in',
    totalAmount: 1050,
    depositAmount: 350,
    paymentMethod: 'credit_card',
    cardDetails: {
      last4: '4242',
      expMonth: 12,
      expYear: 2025,
    },
    specialRequests: 'Late check-out requested',
    isCompanyBooking: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
];

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [billings, setBillings] = useState<Billing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  // Room operations
  const addRoom = (room: Omit<Room, 'id'>) => {
    const newRoom: Room = {
      ...room,
      id: Date.now().toString(),
    };
    setRooms(prev => [...prev, newRoom]);
  };

  const updateRoom = (id: string, roomData: Partial<Room>) => {
    setRooms(prev => prev.map(room => 
      room.id === id ? { ...room, ...roomData } : room
    ));
  };

  const deleteRoom = (id: string) => {
    setRooms(prev => prev.filter(room => room.id !== id));
  };

  // Reservation operations
  const addReservation = (reservationData: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newReservation: Reservation = {
      ...reservationData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setReservations(prev => [...prev, newReservation]);
    
    // Update room status
    updateRoom(reservationData.roomId, { status: 'reserved' });
  };

  const updateReservation = (id: string, reservationData: Partial<Reservation>) => {
    setReservations(prev => prev.map(reservation =>
      reservation.id === id 
        ? { ...reservation, ...reservationData, updatedAt: new Date() }
        : reservation
    ));
  };

  const cancelReservation = (id: string) => {
    const reservation = reservations.find(r => r.id === id);
    if (reservation) {
      updateReservation(id, { status: 'cancelled' });
      updateRoom(reservation.roomId, { status: 'available' });
    }
  };

  const checkIn = (id: string) => {
    const reservation = reservations.find(r => r.id === id);
    if (reservation) {
      updateReservation(id, { status: 'checked-in' });
      updateRoom(reservation.roomId, { status: 'occupied' });
    }
  };

  const checkOut = (id: string) => {
    const reservation = reservations.find(r => r.id === id);
    if (reservation) {
      updateReservation(id, { status: 'checked-out' });
      updateRoom(reservation.roomId, { status: 'available' });
    }
  };

  // Billing operations
  const addBilling = (billingData: Omit<Billing, 'id' | 'createdAt'>) => {
    const newBilling: Billing = {
      ...billingData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setBillings(prev => [...prev, newBilling]);
  };

  const updateBilling = (id: string, billingData: Partial<Billing>) => {
    setBillings(prev => prev.map(billing =>
      billing.id === id ? { ...billing, ...billingData } : billing
    ));
  };

  // Utility functions
  const getAvailableRooms = (checkIn: Date, checkOut: Date): Room[] => {
    return rooms.filter(room => {
      if (room.status === 'maintenance') return false;
      
      // Check if room has conflicting reservations
      const hasConflict = reservations.some(reservation => {
        if (reservation.roomId !== room.id) return false;
        if (reservation.status === 'cancelled') return false;
        
        const resCheckIn = new Date(reservation.checkInDate);
        const resCheckOut = new Date(reservation.checkOutDate);
        
        return (
          (checkIn >= resCheckIn && checkIn < resCheckOut) ||
          (checkOut > resCheckIn && checkOut <= resCheckOut) ||
          (checkIn <= resCheckIn && checkOut >= resCheckOut)
        );
      });
      
      return !hasConflict;
    });
  };

  const getDailyReport = (date: Date): Report | undefined => {
    return reports.find(report => 
      report.date.toDateString() === date.toDateString()
    );
  };

  // Generate sample reports
  useEffect(() => {
    const generateReports = () => {
      const today = new Date();
      const sampleReports: Report[] = [];
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const occupiedRooms = Math.floor(Math.random() * rooms.length);
        const revenue = occupiedRooms * (150 + Math.random() * 200);
        
        sampleReports.push({
          date,
          occupancy: {
            total: rooms.length,
            occupied: occupiedRooms,
            percentage: (occupiedRooms / rooms.length) * 100,
          },
          revenue: {
            rooms: revenue,
            additional: Math.random() * 500,
            total: revenue + Math.random() * 500,
          },
          reservations: {
            new: Math.floor(Math.random() * 10),
            checkedIn: Math.floor(Math.random() * 8),
            checkedOut: Math.floor(Math.random() * 8),
            cancelled: Math.floor(Math.random() * 3),
            noShows: Math.floor(Math.random() * 2),
          },
        });
      }
      
      setReports(sampleReports);
    };
    
    generateReports();
  }, [rooms.length]);

  return (
    <HotelContext.Provider
      value={{
        rooms,
        reservations,
        billings,
        reports,
        loading,
        addRoom,
        updateRoom,
        deleteRoom,
        addReservation,
        updateReservation,
        cancelReservation,
        checkIn,
        checkOut,
        addBilling,
        updateBilling,
        getAvailableRooms,
        getDailyReport,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};