export const formatPrice = (price: number, currency: string) => {
  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price);

  const currencyLabel = currency ? currency.toUpperCase() : '';
  return currencyLabel ? `${formattedNumber} ${currencyLabel}` : formattedNumber;
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
