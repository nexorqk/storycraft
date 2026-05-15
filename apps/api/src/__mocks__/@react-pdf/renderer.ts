export const pdf = jest.fn(() => ({
  toBuffer: jest.fn(() => Promise.resolve(Buffer.from('mock-pdf'))),
  toStream: jest.fn(() => Promise.resolve({
    on: jest.fn((event: string, callback: () => void) => {
      if (event === 'end') {
        callback();
      }
    }),
  })),
  updateContainer: jest.fn(),
}));

export const Document = jest.fn();
export const Page = jest.fn();
export const Text = jest.fn();
export const View = jest.fn();
export const Image = jest.fn();
export const StyleSheet = {
  create: jest.fn((styles) => styles),
};
