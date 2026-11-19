// Curated high quality quiz sets for Networking & Computer Science
const defaultQuizzes = [
  {
    id: "net-fundamentals",
    title: "Computer Networking Fundamentals",
    category: "Networking",
    description: "Master the OSI model, TCP/IP stack, IP addressing, and fundamental protocols.",
    difficulty: "Medium",
    badgeColor: "#FF5B89",
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        question: "Which layer of the OSI model is responsible for end-to-end communication, flow control, and error recovery?",
        options: [
          "Network Layer (Layer 3)",
          "Transport Layer (Layer 4)",
          "Data Link Layer (Layer 2)",
          "Session Layer (Layer 5)"
        ],
        correctAnswer: 1,
        timeLimit: 20,
        explanation: "The Transport Layer (Layer 4), using protocols like TCP, provides end-to-end communication services for applications, including segmentation, flow control, and error recovery."
      },
      {
        id: "q2",
        type: "multiple-choice",
        question: "What flags are exchanged during the classic TCP Three-Way Handshake to establish a connection?",
        options: [
          "SYN -> SYN-ACK -> ACK",
          "ACK -> SYN -> SYN-ACK",
          "SYN -> ACK -> FIN",
          "RST -> SYN -> ACK"
        ],
        correctAnswer: 0,
        timeLimit: 15,
        explanation: "The TCP 3-way handshake begins with client sending SYN, server responding with SYN-ACK, and client confirming with ACK."
      },
      {
        id: "q3",
        type: "true-false",
        question: "UDP is a connectionless protocol that provides guaranteed packet delivery and ordered sequencing.",
        options: [
          "True",
          "False"
        ],
        correctAnswer: 1,
        timeLimit: 15,
        explanation: "False! UDP is connectionless and unreliable (best-effort); it does NOT guarantee delivery, flow control, or packet sequencing, which makes it fast."
      },
      {
        id: "q4",
        type: "multiple-choice",
        question: "In IPv4 subnetting, how many usable host addresses are available in a /26 subnet mask (255.255.255.192)?",
        options: [
          "64 hosts",
          "62 hosts",
          "30 hosts",
          "128 hosts"
        ],
        correctAnswer: 1,
        timeLimit: 25,
        explanation: "A /26 mask leaves 32 - 26 = 6 host bits. Total addresses = 2^6 = 64. Usable host addresses = 64 - 2 (subtracting network and broadcast addresses) = 62."
      },
      {
        id: "q5",
        type: "multiple-choice",
        question: "Which protocol resolves a known IP address to a physical MAC address on a local area network?",
        options: [
          "DNS (Domain Name System)",
          "DHCP (Dynamic Host Config Protocol)",
          "ARP (Address Resolution Protocol)",
          "ICMP (Internet Control Message Protocol)"
        ],
        correctAnswer: 2,
        timeLimit: 15,
        explanation: "ARP (Address Resolution Protocol) broadcasts a request on the local network segment asking 'Who has this IP? Send me your MAC address.'"
      },
      {
        id: "q6",
        type: "multiple-choice",
        question: "HTTP/3 abandons TCP in favor of which UDP-based transport protocol to eliminate head-of-line blocking?",
        options: [
          "SCTP",
          "QUIC",
          "RTP",
          "WebRTC"
        ],
        correctAnswer: 1,
        timeLimit: 20,
        explanation: "HTTP/3 runs over QUIC (Quick UDP Internet Connections), a multiplexed transport protocol built over UDP that solves TCP head-of-line blocking."
      },
      {
        id: "q7",
        type: "true-false",
        question: "A Network Switch operates primarily at Layer 2 (Data Link) using MAC addresses, while a Router operates at Layer 3 (Network) using IP addresses.",
        options: [
          "True",
          "False"
        ],
        correctAnswer: 0,
        timeLimit: 15,
        explanation: "True! Traditional switches forward frames within a LAN based on Layer 2 MAC address tables, whereas routers route packets between distinct subnets based on Layer 3 IP routing tables."
      },
      {
        id: "q8",
        type: "multiple-choice",
        question: "Which DNS record type maps a domain name directly to an IPv6 address?",
        options: [
          "A Record",
          "AAAA Record",
          "CNAME Record",
          "MX Record"
        ],
        correctAnswer: 1,
        timeLimit: 15,
        explanation: "The 'AAAA' record (quad-A) maps hostnames to 128-bit IPv6 addresses, whereas 'A' records map to 32-bit IPv4 addresses."
      }
    ]
  },
  {
    id: "web-protocols-sockets",
    title: "Web Protocols & Real-Time Architectures",
    category: "Web & Realtime",
    description: "Deep dive into WebSockets, HTTP/2 multiplexing, REST vs RPC, and CORS.",
    difficulty: "Advanced",
    badgeColor: "#38E54D",
    questions: [
      {
        id: "w1",
        type: "multiple-choice",
        question: "How does a WebSocket connection begin between a browser and a server?",
        options: [
          "Direct raw TCP socket opened without HTTP",
          "Standard HTTP GET request with an 'Upgrade: websocket' header",
          "Continuous short HTTP POST polling loop",
          "TLS handshake directly over UDP port 443"
        ],
        correctAnswer: 1,
        timeLimit: 20,
        explanation: "WebSockets initiate with an HTTP 1.1 handshake request containing headers `Upgrade: websocket` and `Connection: Upgrade`. The server responds with `101 Switching Protocols`."
      },
      {
        id: "w2",
        type: "multiple-choice",
        question: "What HTTP response status code indicates '101 Switching Protocols'?",
        options: [
          "200 OK",
          "101 Switching Protocols",
          "301 Moved Permanently",
          "426 Upgrade Required"
        ],
        correctAnswer: 1,
        timeLimit: 15,
        explanation: "Status code 101 indicates that the server understands and is willing to comply with the client's request to switch protocols via the Upgrade header."
      },
      {
        id: "w3",
        type: "true-false",
        question: "In WebSockets, both client and server can send full-duplex, bidirectional messages at any time over a single persistent TCP connection.",
        options: [
          "True",
          "False"
        ],
        correctAnswer: 0,
        timeLimit: 15,
        explanation: "True! Unlike request-response HTTP polling, WebSockets provide persistent full-duplex communication with minimal frame overhead."
      },
      {
        id: "w4",
        type: "multiple-choice",
        question: "What mechanism does a browser use for CORS preflight checks before sending certain cross-origin requests?",
        options: [
          "HTTP HEAD request",
          "HTTP OPTIONS request",
          "HTTP TRACE request",
          "DNS TXT record query"
        ],
        correctAnswer: 1,
        timeLimit: 20,
        explanation: "The browser automatically sends an HTTP OPTIONS preflight request to verify allowed methods, headers, and origins before executing non-simple cross-origin requests."
      },
      {
        id: "w5",
        type: "multiple-choice",
        question: "Which feature of HTTP/2 allows multiple request and response messages to be in flight simultaneously on a single TCP connection?",
        options: [
          "Multiplexing via Binary Framing",
          "Chunked Transfer Encoding",
          "GZIP Content Compression",
          "Domain Sharding"
        ],
        correctAnswer: 0,
        timeLimit: 20,
        explanation: "HTTP/2 introduces binary framing and stream multiplexing, allowing multiple bidirectional requests and responses interleaved concurrently over a single TCP connection."
      }
    ]
  },
  {
    id: "cyber-security",
    title: "Network Security & Cyber Defense",
    category: "Cybersecurity",
    description: "Test knowledge on SSL/TLS, Man-in-the-Middle attacks, Firewalls, and Encryption.",
    difficulty: "Medium",
    badgeColor: "#FFB800",
    questions: [
      {
        id: "s1",
        type: "multiple-choice",
        question: "In TLS 1.3, how many round trips (RTT) are required for a standard full handshake before encrypted application data can be sent?",
        options: [
          "2 RTT",
          "1 RTT (with 0-RTT resumption available)",
          "3 RTT",
          "4 RTT"
        ],
        correctAnswer: 1,
        timeLimit: 20,
        explanation: "TLS 1.3 optimized the handshake down to 1-RTT for new connections and supports 0-RTT session resumption, significantly speeding up secure connections."
      },
      {
        id: "s2",
        type: "multiple-choice",
        question: "What type of attack involves an attacker broadcasting fake ARP messages onto a LAN to associate their MAC address with the default gateway's IP?",
        options: [
          "DNS Poisoning",
          "ARP Spoofing / Poisoning",
          "SQL Injection",
          "SYN Flood Attack"
        ],
        correctAnswer: 1,
        timeLimit: 20,
        explanation: "ARP Spoofing (or Poisoning) allows an attacker to intercept, modify, or stop traffic destined for the legitimate gateway, enabling Man-in-the-Middle (MitM) eavesdropping."
      },
      {
        id: "s3",
        type: "true-false",
        question: "Symmetric encryption uses the same secret key for both encrypting and decrypting data, whereas Asymmetric encryption uses a public-private key pair.",
        options: [
          "True",
          "False"
        ],
        correctAnswer: 0,
        timeLimit: 15,
        explanation: "True! AES is symmetric (fast, single shared key), while RSA and ECC are asymmetric (key pair for key exchange and digital signatures)."
      },
      {
        id: "s4",
        type: "multiple-choice",
        question: "Which port does secure HTTPS communicate over by default?",
        options: [
          "Port 80",
          "Port 22",
          "Port 443",
          "Port 8080"
        ],
        correctAnswer: 2,
        timeLimit: 15,
        explanation: "Default port for HTTPS is 443. Standard unencrypted HTTP uses port 80, and SSH uses port 22."
      }
    ]
  }
];

module.exports = defaultQuizzes;
