import sys

def main():
    if len(sys.argv) != 3:
        print("Usage: script.py <arg1> <arg2>")
        sys.exit(1)
    
    arg1 = sys.argv[1]
    arg2 = sys.argv[2]
    print(f"Arguments received: {arg1}, {arg2}")

if __name__ == "__main__":
    main()