const rankValue = {
  "2": 1,  "3": 2,  "4": 3,  "5": 4,  "6": 5,  "7": 6, "8": 7,
  "9": 8,  "10": 9, "J": 10, "Q": 11, "K": 12, "A": 13
};

let players = [{hand:[]},{hand:[]},{hand:[]},{hand:[]}];
let trump_suit = null;
let king = null;
let current_leader = null;
let trick = [];
let tricks = [0,0,0,0];
let round = 1;
let turn_order = [];
let turn_index = 0;
let user_played = false;

const create_deck = () => {
  let deck = [];
  for (let s=0;s<suits.length;s++) {
    for (let r=0;r<ranks.length;r++) {
      deck.push({suit:suits[s],rank:ranks[r]});
    }
  }
  return deck;
}

const shuffle = (deck) => {
  for (let i=deck.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]] = [deck[j],deck[i]];
  }
  return deck;
}

const card_beats = (cardA,cardB,leadSuit,trump) => {
  if(cardA.suit==trump&&cardB.suit!=trump) return true;
  if(cardB.suit==trump&&cardA.suit!=trump) return false;
  if(cardA.suit==cardB.suit) {
    return rankValue[cardA.rank]>rankValue[cardB.rank];
  }
  if(cardA.suit==leadSuit&&cardB.suit!=leadSuit) return true;
  return false;
}

const trick_winner = (trick,trump) => {
  let winning = trick[0];
  const lead = winning.card.suit;
  for (let i=1;i<trick.length;i++) {
    const play = trick[i];
    if (card_beats(play.card,winning.card,lead,trump)) {
      winning = play;
    }
  }
  return winning.player;
}

const validate_card = (i,card) => {
  const hand = players[i].hand;
  if (trick.length==0) return true;
  const lead = trick[0].card.suit;
  if (card.suit==lead) return true;
  if (hand.some(c=>c.suit==lead)) {
    return false;
  }
  return true;
}

const user_play = (i) => {
  if (user_played==true) return;
  if (turn_order[turn_index]!=0) return;
  const card = players[0].hand[i];
  if(!validate_card(0,card)) {
    return;
  }
  user_played = true;
  remove_card(0,card);
  trick.push({player:0,card:card});
  drop_card(0,card);
  log("Player 1 Played <span style=\"font-family:'cardr'\""+((card.suit=="♦"||card.suit=="♥")?" class=\"red\"":"")+">"+card.rank+card.suit+"</span>");
  setTimeout(next_turn,250);
}

const bot_play = (playerIndex) => { 
  const hand = players[playerIndex].hand;
  let validCards = [];
  if (trick.length == 0) {
    validCards = hand.slice();
  } else {
    let leadSuit = trick[0]?.card?.suit;
    if (leadSuit) {
      validCards = hand.filter(c => c.suit == leadSuit);
    }
    if (validCards.length == 0) validCards = hand.slice();
  }
  let currentWinning = null;
  let winningPlayer = null;
  if (trick.length > 0) {
    let leadSuit = trick[0]?.card?.suit;
    if (leadSuit) {
      currentWinning = trick[0].card;
      winningPlayer = trick[0].player;
      trick.forEach(p => {
        if (card_beats(p.card, currentWinning, leadSuit,trump_suit)) {
          currentWinning = p.card;
          winningPlayer = p.player;
        }
      });
    }
  }
  let teammateIndex = (playerIndex + 2) % 4;
  let candidate;
  if (winningPlayer == teammateIndex) {
    candidate = validCards.reduce((min, c) => rankValue[c.rank] < rankValue[min.rank] ? c : min, validCards[0]);
  } else {
    let betterCards = [];
    if (currentWinning) {
      betterCards = validCards.filter(c => card_beats(c, currentWinning, trick[0]?.card?.suit, trump_suit));
    }
    if (betterCards.length > 0) {
      candidate = betterCards.reduce((min, c) => rankValue[c.rank] < rankValue[min.rank] ? c : min, betterCards[0]);
    } else {
      candidate = validCards.reduce((min, c) => rankValue[c.rank] < rankValue[min.rank] ? c : min, validCards[0]);
    }
  }
  remove_card(playerIndex, candidate);
  trick.push({ player: playerIndex, card: candidate });
  drop_card(playerIndex,candidate);
  log("Player "+(playerIndex+1)+" Played <span style=\"font-family:'cardr'\""+((candidate.suit=="♦"||candidate.suit=="♥")?" class=\"red\"":"")+">"+candidate.rank+candidate.suit+"</span>");
  setTimeout(next_turn, 250);
}

const sort_hand = (hand) => {
  return hand.sort((a,b) => {
    if (a.suit==b.suit) {
      return rankValue[a.rank]-rankValue[b.rank];
    } else {
      return suits.indexOf(a.suit)-suits.indexOf(b.suit);
    }
  });
}

const remove_card = (i,card) => {
  players[i].hand = players[i].hand.filter(c=>!(c.suit==card.suit&&c.rank==card.rank));
}

const next_turn = async () => {
  if (trick.length<4) {
    turn_index++;
    turn_index%=4;
    const next = turn_order[turn_index];
    if (next!=0) {
      setTimeout(bot_play,250,next);
    } else {
      user_played = false;
    }
  } else {
    const winner = trick_winner(trick,trump_suit);
    await new Promise(resolve=>setTimeout(resolve,1000));
    take_cards(trick,winner);
    tricks[winner]++;
    log("Player "+(winner+1)+" won the Trick.");
    current_leader = winner;
    setTimeout(() => {
      trick = [];
      round++;
      const t1 = tricks[0]+tricks[2];
      const t2 = tricks[1]+tricks[3];
      if(t1>6||t2>6) end();
      else start_trick();
    },250);
  }
}

const start_trick = () => {
  log("<br>Trick "+round+":");
  turn_order = [];
  for(let i = 0; i < 4; i++){
    turn_order.push((current_leader+i)%4);
  }
  turn_index = 0;
  if(turn_order[0] == 0) {
    user_played = false;
  } else {
    bot_play(turn_order[0]);
  }
}

//--- ---//

const drop_hands = (j=0) => {
  const s = players[j].hand.length/2-0.5;
  const k = 4;
  for (let i=0;i<players[j].hand.length;i++) {
    const card = players[j].hand[i];
    let b = (1-Math.sin(i*Math.PI/2/s))*s/4;
    if (s<1) b=0;
    switch (j) {
      case 0:
        spos(`${card.rank}-${card.suit}`,{
          x: (i-s)*k,
          y: 40+b,
          z: i/8-b,
          rx: -40,
          ry: 0,
          rz: (i-s)*2
        });
        const e = document.getElementById(`${card.rank}-${card.suit}`);
        e.classList.add("t2");
        e.setAttribute("onclick","user_play("+i+")");
        break;
      case 1:
        spos(`${card.rank}-${card.suit}`,{
          x: -35-i/8,
          y: (i-s)*k,
          z: i/8,
          ry: -80,
          rz: 90//+(i-s)*2
        });
        break;
      case 2:
        spos(`${card.rank}-${card.suit}`,{
          x: (i-s)*k,
          y: -40-b*0.5,
          z: -i/8-b*0.86,
          rx: 60,
          ry: 0,
          rz: 180-(i-s)*2
        });
        break;
      case 3:
        spos(`${card.rank}-${card.suit}`,{
          x: 35-i/8+1.625,
          y: (i-s)*k,
          z: i/8,
          ry: 80,
          rz: 270//-(i-s)*2
        });
        break;
    }
  }
  if (j<3) setTimeout(drop_hands,250,j+1);
}

const drop_card = (p,card) => {
  const nr = Math.random()*10-5;
  const nx = Math.random()*5-2.5;
  const ny = Math.random()*5-2.5;
  switch (p) {
    case 0:
      spos(`${card.rank}-${card.suit}`,{
        x: nx,
        y: ny+20,
        z: 0,
        rx: 0,
        ry: 0,
        rz: nr
      });
      const e = document.getElementById(`${card.rank}-${card.suit}`);
      e.classList.remove("t2");
      e.removeAttribute("onclick");
      drop_hands();
      break;
    case 1:
      spos(`${card.rank}-${card.suit}`,{
        x: nx-20,
        y: ny,
        z: 0,
        rx: 0,
        ry: 0,
        rz: nr+90
      });
      break;
    case 2:
      spos(`${card.rank}-${card.suit}`,{
        x: nx,
        y: ny-20,
        z: 0,
        rx: 0,
        ry: 0,
        rz: nr+180
      });
      break;
    case 3:
      spos(`${card.rank}-${card.suit}`,{
        x: nx+20,
        y: ny,
        z: 0,
        rx: 0,
        ry: 0,
        rz: nr+270
      });
      break;
  }
}

const take_cards = (cards,winner) => {
  for (let i=0;i<cards.length;i++) {
    const card = cards[i].card;
    switch (winner) {
      case 0:
      case 2:
        spos(`${card.rank}-${card.suit}`,{
          s: 0.5,
          x: -30+(tricks[0]+tricks[2])*4,
          y: -30+((tricks[0]+tricks[2])%2)*2.5,
          z: -5+(tricks[0]+tricks[2])/4,
          rx: 0,
          ry: 180,
          rz: 180
        });
        break;
      case 1:
      case 3:
        spos(`${card.rank}-${card.suit}`,{
          s: 0.5,
          x: -25+((tricks[1]+tricks[3])%2)*2.5,
          y: 35-(tricks[1]+tricks[3])*4,
          z: -5+(tricks[1]+tricks[3])/4,
          rx: 0,
          ry: 180,
          rz: 270
        });
        break;
    }
  }
}

const find_king = () => {
  const deck = shuffle(create_deck());
  let t = 0;
  function draw(deck) {
    const card = deck.pop();
    const z = t/32;
    const nr = Math.random()*10-5;
    const nx = Math.random()*5-2.5;
    const ny = Math.random()*5-2.5;
    switch (t%4) {
      case 0:
        spos(`${card.rank}-${card.suit}`,{x:nx   ,y:ny+40,ry:0,rz:    nr,z});
        break;
     case 1:
        spos(`${card.rank}-${card.suit}`,{x:nx-40,y:ny   ,ry:0,rz: 90+nr,z});
        break;
      case 2:
        spos(`${card.rank}-${card.suit}`,{x:nx   ,y:ny-40,ry:0,rz:180+nr,z});
        break;
     case 3:
        spos(`${card.rank}-${card.suit}`,{x:nx+40,y:ny   ,ry:0,rz:270+nr,z});
        break;
    }
    if (card.rank=="A") {
      king = t%4;
      log("Player "+(king+1)+" is The King.");
      select_trump();
      return;
    }
    t++;
    setTimeout(draw,250,deck);
  }
  draw(deck);
}

const select_trump = async () => {
  const deck = shuffle(create_deck());
  await new Promise(resolve=>setTimeout(resolve,1000));
  reset_cards();
  await new Promise(resolve=>setTimeout(resolve,1500));
  let order = [];
  for (let i=0;i<4;i++){
    order.push((king+i)%4);
  }
  order.forEach(p => {
     players[p].hand = deck.splice(0,5);
  });
  drop_hands();
  await new Promise(resolve=>setTimeout(resolve,1000));
  if(king==0) {
    select_trump_board.classList.add("active");
  } else {
    let counts = {};
    players[king].hand.forEach(c => { counts[c.suit] = (counts[c.suit]||0)+1; });
    trump_suit = Object.keys(counts).reduce((a,b)=>counts[a]>=counts[b]?a:b);
    trump_board.children[suits.indexOf(trump_suit)].style.display = "flex";
    log("King selected <span style=\"font-family:'cardr'\""+((trump_suit=="♦"||trump_suit=="♥")?" class=\"red\"":"")+">"+trump_suit+"</span> as Trump.");
    setTimeout(complete_dealing,500);
  }
}

document.querySelectorAll("#select_trump_board div").forEach(btn => {
  btn.addEventListener("click",function () {
    trump_suit = this.innerText;
    trump_board.children[suits.indexOf(trump_suit)].style.display = "flex";
    select_trump_board.classList.remove("active");
    log("King selected <span style=\"font-family:'cardr'\""+((trump_suit=="♦"||trump_suit=="♥")?" class=\"red\"":"")+">"+trump_suit+"</span> as Trump.");
    complete_dealing();
  });
});

const complete_dealing = async () => {
  const deck = shuffle(create_deck());
  players.forEach(p => {
     p.hand.forEach(c => {
       for (let i=0;i<deck.length;i++){
         if(deck[i].suit==c.suit&&deck[i].rank==c.rank) {
            deck.splice(i,1);
            break;
         }
       }
     });
  });
  let order = [];
  for (let i=0;i<4;i++){
    order.push((king+i)%4);
  }
  order.forEach(p => {
    let cards = deck.splice(0,4);
    players[p].hand = players[p].hand.concat(cards);
  });
  drop_hands();
  order.forEach(p => {
    let cards = deck.splice(0,4);
    players[p].hand = players[p].hand.concat(cards);
  });
  await new Promise(resolve=>setTimeout(resolve,1000));
  drop_hands();
  current_leader = king;
  order.forEach(p => {
    players[p].hand = sort_hand(players[p].hand);
  });
  await new Promise(resolve=>setTimeout(resolve,1000));
  drop_hands();
  setTimeout(start_trick,1000);
}

const start = () => {
  start_btn.style.display = "none";
  players = [{hand:[]},{hand:[]},{hand:[]},{hand:[]}];
  trump_suit = null;
  king = null;
  current_leader = null;
  trick = [];
  tricks = [0,0,0,0];
  round = 1;
  turn_order = [];
  turn_index = 0;
  user_played = false;
  log("Game Started.");
  find_king();
}

const end = async () => {
  const t1 = tricks[0]+tricks[2];
  const t2 = tricks[1]+tricks[3];
    log((t1>t2?"Your Team Won.":"Your Team Lost. ")+"<br>");//t1+":"+t2
  alert((t1>t2?"Your Team Won.":"Your Team Lost. "));//t1+":"+t2
  reset_cards();
  await new Promise(resolve=>setTimeout(resolve,1000));
  trump_board.children[suits.indexOf(trump_suit)].style.display = "none";
  start_btn.style.display = "flex";
}

const log = (txt) => {
  log_board.innerHTML += txt+"<br>";
  log_board.scrollTop = log_board.scrollHeight;
}

log("<span style=\"font-family:'cardr'\">JOKE</span> v0.1 Beta - Nxrix<br>");
start_btn.onclick = start;