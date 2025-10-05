const Reservation = require('../models/Reservation');
const Room = require('../models/Room');

exports.getAllReservations = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'customer') {
      query.customerId = req.user.id;
    } else if (req.user.role === 'travel_company') {
      query.isCompanyBooking = true;
      query.companyId = req.user.id;
    }

    const reservations = await Reservation.find(query)
      .populate('roomId', 'number type price')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reservations.length,
      data: reservations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('roomId', 'number type price amenities')
      .populate('customerId', 'name email phone');

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (req.user.role === 'customer' && reservation.customerId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this reservation' });
    }

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createReservation = async (req, res) => {
  try {
    const room = await Room.findById(req.body.roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const checkInDate = new Date(req.body.checkInDate);
    const checkOutDate = new Date(req.body.checkOutDate);

    const conflictingReservation = await Reservation.findOne({
      roomId: req.body.roomId,
      status: { $nin: ['cancelled', 'checked-out'] },
      $or: [
        {
          checkInDate: { $lt: checkOutDate },
          checkOutDate: { $gt: checkInDate }
        }
      ]
    });

    if (conflictingReservation) {
      return res.status(400).json({ message: 'Room is not available for selected dates' });
    }

    const reservationData = {
      ...req.body,
      customerId: req.body.customerId || req.user.id
    };

    if (req.user.role === 'travel_company') {
      reservationData.isCompanyBooking = true;
      reservationData.companyId = req.user.id;
    }

    const reservation = await Reservation.create(reservationData);

    if (reservation.status === 'confirmed') {
      await Room.findByIdAndUpdate(req.body.roomId, { status: 'reserved' });
    }

    res.status(201).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    res.status(400).json({ message: 'Failed to create reservation', error: error.message });
  }
};

exports.updateReservation = async (req, res) => {
  try {
    let reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (req.user.role === 'customer' && reservation.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this reservation' });
    }

    reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update reservation', error: error.message });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (req.user.role === 'customer' && reservation.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this reservation' });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    await Room.findByIdAndUpdate(reservation.roomId, { status: 'available' });

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: reservation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (reservation.status !== 'confirmed') {
      return res.status(400).json({ message: 'Can only check-in confirmed reservations' });
    }

    reservation.status = 'checked-in';
    await reservation.save();

    await Room.findByIdAndUpdate(reservation.roomId, { status: 'occupied' });

    res.json({
      success: true,
      message: 'Checked in successfully',
      data: reservation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (reservation.status !== 'checked-in') {
      return res.status(400).json({ message: 'Can only check-out checked-in reservations' });
    }

    reservation.status = 'checked-out';
    await reservation.save();

    await Room.findByIdAndUpdate(reservation.roomId, { status: 'available' });

    res.json({
      success: true,
      message: 'Checked out successfully',
      data: reservation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
