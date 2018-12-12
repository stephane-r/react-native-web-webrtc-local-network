import React from "react";
import { StyleSheet, View, Button, Dimensions, Text } from "react-native-web";
import ConnectionState from "./components/ConnectionState";
import WebRTCView from "./components/WebRTCView";
import Status from "./components/Status";

let InitiatorComponent;
let _chatChannel;

const configuration = { iceServers: [{ urls: [] }] };
const pc = new RTCPeerConnection(configuration);

pc.oniceconnectionstatechange = () => InitiatorComponent.setConnectionState();
pc.onsignalingstatechange = () => InitiatorComponent.setSignalingState();
pc.onaddstream = ({ stream }) => {
  InitiatorComponent.setState({
    receiverVideoURL: stream.toURL()
  });
};
pc.onicecandidate = async ({ candidate }) => {
  if (candidate === null) {
    const { offer } = InitiatorComponent.state;
    const field = !offer ? "offer" : "data";

    await InitiatorComponent.setState({
      [field]: JSON.stringify(pc.localDescription)
    });
  }
};

function createOffer() {
  _chatChannel = pc.createDataChannel("chatChannel");
  chatChannel(_chatChannel);

  pc.createOffer()
    .then(offer => pc.setLocalDescription(offer))
    .then(() => {
      InitiatorComponent.setState({
        offerCreated: true
      });
    })
    .catch(InitiatorComponent.logError);
}

function chatChannel() {
  _chatChannel.onopen = function(e) {
    console.log("chat channel is open", e);
  };
  _chatChannel.onmessage = function(e) {
    console.log(e);
  };
  _chatChannel.onclose = function() {
    console.log("chat channel closed");
  };
}

function importOffer() {
  const { data } = InitiatorComponent.state;

  if (data) {
    const sd = new RTCSessionDescription(JSON.parse(data));

    pc.setRemoteDescription(sd)
      .then(() => {
        if (sd.type === "offer") {
          createAnswer();
        }
      })
      .catch(InitiatorComponent.logError);
  }
}

function createAnswer() {
  pc.createAnswer()
    .then(answer => pc.setLocalDescription(answer))
    .then(async () => {
      await InitiatorComponent.setState({
        offerImported: true,
        answerCreated: true
      });
    })
    .catch(InitiatorComponent.logError);
}

// function getLocalStream(callback) {
//   MediaStreamTrack.getSources(() => {
//     getUserMedia(
//       {
//         audio: false,
//         video: true
//       },
//       stream => callback(stream),
//       InitiatorComponent.getUserMediaError
//     );
//   });
// }

const initialState = {
  peerCreated: false,
  offerCreated: false,
  offerImported: false,
  answerCreated: false,
  answerImported: false,
  connectionState: null,
  signalingState: null,
  initiator: false,
  videoURL: null,
  offer: null,
  data: null,
  error: [],
  clientConnected: false,
  ip: false
};

class InitiatorScreen extends React.Component {
  static navigationOptions = {
    header: null
  };

  state = initialState;

  componentDidMount() {
    InitiatorComponent = this;

    if (pc) {
      this.setState({
        peerCreated: true
      });
    }

    // Doc. : https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
    this.setConnectionState();

    // Doc. : https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingState
    this.setSignalingState();
  }

  setConnectionState() {
    this.setState({
      connectionState: pc.iceConnectionState
    });
  }

  setSignalingState() {
    this.setState({
      signalingState: pc.signalingState
    });
  }

  getUserMediaError(error) {
    console.log(error);
  }

  logError(error) {
    const errorArray = [...this.state.error, error];
    return this.setState({
      error: errorArray
    });
  }

  /**
   * Start communication
   *
   * @param {boolean} [initiator=true]
   * @returns
   * @memberof InitiatorScreen
   */
  start(initiator = this.state.initiator) {
    if (initiator) {
      this.setState({
        initiator: true
      });

      return createOffer();
    }

    return importOffer();
  }

  render() {
    const {
      offer,
      data,
      initiator,
      videoURL,
      receiverVideoURL,
      connectionState,
      signalingState,
      error,
      peerCreated,
      offerCreated,
      offerImported,
      answerCreated,
      answerImported,
      clientConnected,
      ip
    } = this.state;

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          {data &&
            initiator && (
              <Button title="Import answer" onPress={() => importOffer()} />
            )}
          <ConnectionState text={connectionState} />
          <ConnectionState text={signalingState} />
          <View style={{ flexDirection: "row", flexWrap: "nowrap" }}>
            <Status text="Ip is" isTrue={ip} />
            <Status text="Client/server" isTrue={clientConnected} />
            <Status text="Initiator" isTrue={initiator} />
            <Status text="Peer created" isTrue={peerCreated} />
            <Status text="Offer created" isTrue={offerCreated} />
            <Status text="Offer imported" isTrue={offerImported} />
            <Status text="Answer created" isTrue={answerCreated} />
            <Status text="Answer imported" isTrue={answerImported} />
          </View>
        </View>
        {error.length > 0 && (
          <View>
            {error.map((e, index) => (
              <Text key={index}>{e}</Text>
            ))}
          </View>
        )}
        <View style={styles.container}>
          <WebRTCView
            title="Create offer"
            onPress={() => this.start(true)}
            disabled={false}
            placeholder="Offer"
            onChangeText={value => console.log(value)}
            value={offer}
            streamURL={videoURL}
          />
          <WebRTCView
            title="Create Answer"
            onPress={() => this.start()}
            disabled={data === null}
            placeholder="Paste initiator offer"
            onChangeText={value => this.setState({ data: value })}
            value={data}
            streamURL={receiverVideoURL}
          />
        </View>
      </View>
    );
  }
}

const isMediumSize = Dimensions.get("window").width > 640;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: isMediumSize ? "row" : "column"
  },
  header: {
    width: "100%"
  }
});

export default InitiatorScreen;
