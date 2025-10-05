import React, { useState } from 'react';
import { useHotel } from '../../contexts/HotelContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Users, CreditCard, MapPin, Phone, Mail, User } from 'lucide-react';

interface ReservationFormProps {
  onClose: () => void;
  onSubmit?: () => void;
}

const ReservationForm: React.FC<ReservationFormProps> = ({ onClose, onSubmit }) => {
  const { addReservation, getAvailableRooms } = useHotel();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    customerName: user?.role === 'customer' ? user.name : '',
    customerEmail: user?.role === 'customer' ? user.email : '',
    customerPhone: user?.role === 'customer' ? user.phone || '' : '',
    checkInDate: '',
    checkOutDate: '',
    guests: 1,
    roomType: '',
    paymentMethod: 'pending' as 'pending' | 'credit_card' | 'cash',
    cardNumber: '',
    cardExpMonth: '',
    cardExpYear: '',
    cardCvc: '',
    specialRequests: '',
    isCompanyBooking: user?.role === 'travel_company',
  });
  
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const roomTypes = [
    { value: 'standard', label: 'Standard Room', basePrice: 150 },
    { value: 'deluxe', label: 'Deluxe Room', basePrice: 220 },
    { value: 'suite', label: 'Suite', basePrice: 350 },
    { value: 'residential', label: 'Residential Suite', basePrice: 500 },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const searchAvailableRooms = () => {
    if (formData.checkInDate && formData.checkOutDate) {
      const checkIn = new Date(formData.checkInDate);
      const checkOut = new Date(formData.checkOutDate);
      
      if (checkIn >= checkOut) {
        alert('Check-out date must be after check-in date');
        return;
      }
      
      const available = getAvailableRooms(checkIn, checkOut);
      const filteredRooms = formData.roomType 
        ? available.filter(room => room.type === formData.roomType)
        : available;
      
      setAvailableRooms(filteredRooms);
    }
  };

  const calculateTotal = () => {
    if (!selectedRoom || !formData.checkInDate || !formData.checkOutDate) return 0;
    
    const room = availableRooms.find(r => r.id === selectedRoom);
    if (!room) return 0;
    
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
    
    let total = room.price * nights;
    
    // Apply company discount
    if (formData.isCompanyBooking) {
      // Assuming 15% discount for travel companies
      total *= 0.85;
    }
    
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      alert('Please select a room');
      return;
    }
    
    setLoading(true);
    
    try {
      const room = availableRooms.find(r => r.id === selectedRoom);
      const total = calculateTotal();
      
      const reservationData = {
        customerId: user?.id || 'guest',
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        roomId: selectedRoom,
        roomNumber: room.number,
        checkInDate: new Date(formData.checkInDate),
        checkOutDate: new Date(formData.checkOutDate),
        guests: formData.guests,
        status: 'confirmed' as const,
        totalAmount: total,
        depositAmount: formData.paymentMethod === 'credit_card' ? total * 0.5 : 0,
        paymentMethod: formData.paymentMethod,
        cardDetails: formData.paymentMethod === 'credit_card' ? {
          last4: formData.cardNumber.slice(-4),
          expMonth: parseInt(formData.cardExpMonth),
          expYear: parseInt(formData.cardExpYear),
        } : undefined,
        specialRequests: formData.specialRequests,
        isCompanyBooking: formData.isCompanyBooking,
        discount: formData.isCompanyBooking ? 15 : undefined,
      };
      
      addReservation(reservationData);
      
      if (onSubmit) onSubmit();
      onClose();
    } catch (error) {
      alert('Failed to create reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">New Reservation</h2>
          <p className="text-blue-100">Create a new hotel reservation</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Guest Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Guest Name
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email Address
              </label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="inline h-4 w-4 mr-1" />
                Number of Guests
              </label>
              <input
                type="number"
                name="guests"
                min="1"
                max="6"
                value={formData.guests}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Dates and Room Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Check-in Date
              </label>
              <input
                type="date"
                name="checkInDate"
                value={formData.checkInDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Check-out Date
              </label>
              <input
                type="date"
                name="checkOutDate"
                value={formData.checkOutDate}
                onChange={handleInputChange}
                min={formData.checkInDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Room Type (Optional)
              </label>
              <select
                name="roomType"
                value={formData.roomType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Type</option>
                {roomTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} (${type.basePrice}/night)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Available Rooms */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={searchAvailableRooms}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search Available Rooms
            </button>
          </div>

          {/* Available Rooms */}
          {availableRooms.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Rooms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableRooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedRoom === room.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">Room {room.number}</h4>
                      <span className="text-lg font-bold text-green-600">
                        ${room.price}/night
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 capitalize mb-1">{room.type} Room</p>
                    <p className="text-sm text-gray-600">Capacity: {room.capacity} guests</p>
                    <p className="text-sm text-gray-600">Floor: {room.floor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="inline h-4 w-4 mr-1" />
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="pending">Reserve without Payment (Auto-cancel at 7 PM)</option>
              <option value="credit_card">Credit Card (50% Deposit)</option>
              <option value="cash">Pay at Check-in</option>
            </select>
          </div>

          {/* Credit Card Details */}
          {formData.paymentMethod === 'credit_card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    name="cardExpMonth"
                    value={formData.cardExpMonth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <select
                    name="cardExpYear"
                    value={formData.cardExpYear}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">YY</option>
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i} value={2025 + i}>{2025 + i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
                  <input
                    type="text"
                    name="cardCvc"
                    value={formData.cardCvc}
                    onChange={handleInputChange}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Special Requests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Requests (Optional)
            </label>
            <textarea
              name="specialRequests"
              value={formData.specialRequests}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Late check-in, extra towels, etc."
            />
          </div>

          {/* Total Amount */}
          {selectedRoom && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="text-blue-600">
                  ${calculateTotal().toLocaleString()}
                  {formData.isCompanyBooking && (
                    <span className="text-sm text-green-600 ml-2">(15% Company Discount Applied)</span>
                  )}
                </span>
              </div>
              {formData.paymentMethod === 'credit_card' && (
                <p className="text-sm text-gray-600 mt-1">
                  Deposit Required: ${(calculateTotal() * 0.5).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedRoom}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationForm;