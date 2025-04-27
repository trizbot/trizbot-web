export class Helper {
  static convertNumberStrings(obj: any) {
    // Check if it's an object or array
    if (typeof obj === 'object' && obj !== null) {
      for (let key in obj) {
        if (typeof obj[key] === 'string' && !isNaN(obj[key] as any)) {
          // Convert to a number (int or float depending on the string)
          obj[key] = obj[key].includes('.')
            ? parseFloat(obj[key])
            : parseInt(obj[key]);
        } else if (typeof obj[key] === 'object') {
          // Recurse for nested objects or arrays
          Helper.convertNumberStrings(obj[key]);
        }
      }
    }
    return obj;
  }

  static truncate(text: string, length = 20) {
    if (text.length > length) {
      return `${text.substring(0, length)}...`;
    } else {
      return text;
    }
  }
}
