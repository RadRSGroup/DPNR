import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegistrationScreen from '../RegistrationScreen';

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('RegistrationScreen', () => {
  it('renders the registration form', () => {
    renderWithRouter(<RegistrationScreen />);
    
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email *')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name (Optional)')).toBeInTheDocument();
    expect(screen.getByText('I agree to the Privacy Policy *')).toBeInTheDocument();
    expect(screen.getByText('Begin Assessment')).toBeInTheDocument();
  });

  it('validates email format', () => {
    renderWithRouter(<RegistrationScreen />);
    
    const emailInput = screen.getByLabelText('Email *');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('requires privacy consent', () => {
    renderWithRouter(<RegistrationScreen />);
    
    const submitButton = screen.getByText('Begin Assessment');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('You must accept the privacy policy')).toBeInTheDocument();
  });

  it('enables submit button when form is valid', () => {
    renderWithRouter(<RegistrationScreen />);
    
    const emailInput = screen.getByLabelText('Email *');
    const privacyCheckbox = screen.getByLabelText('I agree to the Privacy Policy *');
    const submitButton = screen.getByText('Begin Assessment');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(privacyCheckbox);
    
    expect(submitButton).not.toBeDisabled();
  });

  it('disables submit button when form is invalid', () => {
    renderWithRouter(<RegistrationScreen />);
    
    const submitButton = screen.getByText('Begin Assessment');
    expect(submitButton).toBeDisabled();
  });
}); 