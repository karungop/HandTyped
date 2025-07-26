import tkinter as tk
from multiprocessing import Process
from main import start_detection

class HandKeyApp:
    def __init__(self, root):
        self.root = root
        self.root.title("HandTyped")

        self.label = tk.Label(root, text="Gesture Detection App")
        self.label.pack(pady=10)

        self.start_button = tk.Button(root, text="Start", command=self.start)
        self.start_button.pack(pady=5)

        self.stop_button = tk.Button(root, text="Stop", command=self.stop)
        self.stop_button.pack(pady=5)

        self.process = None

    def start(self):
        if not self.process or not self.process.is_alive():
            self.process = Process(target=start_detection)
            self.process.start()

    def stop(self):
        if self.process and self.process.is_alive():
            self.process.terminate()
            self.process.join()

if __name__ == "__main__":
    from multiprocessing import freeze_support
    freeze_support()  # Required on Windows

    root = tk.Tk()
    app = HandKeyApp(root)
    root.mainloop()
