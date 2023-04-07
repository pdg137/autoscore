var board
var ownership_white
var ownership_black
var width
var height

function failed() {
    $('#white').text('Failed')
    $('#black').text('Failed')
    $('#combined').text('Failed')
}

function show() {
    width = board[0].length
    height = board.length
    var text = ''

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            switch(board[y][x]) {
            case 1:
                text += '⚫'
                break
            case 2:
                text += '⚪'
                break
            default:
                text += '➕'
            }
        }
        text += "\n"
    }

    $('#board').text(text)
    ajax_white = getEstimate('white')
    ajax_black = getEstimate('black')

    $.when(ajax_white, ajax_black).done(function(result_white, result_black) {
        if(result_white[1] != 'success' || result_black[1] != 'success')
        {
            failed()
            return
        }

        ownership_white = result_white[0].ownership
        ownership_black = result_black[0].ownership
        show_algorithm()
    })

}

function show_algorithm() {
    show_ownership(ownership_white, $('#white'))
    show_ownership(ownership_black, $('#black'))

    compute_combined_ownership()
}

function compute_combined_ownership() {
    var text = ''

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            var state = board[y][x]
            var owner1 = get_owner(ownership_white, x, y)
            var owner2 = get_owner(ownership_black, x, y)

            var owner = 0
            if(owner1 == owner2)
                owner = owner1

            var result = 0 // unknown
            if(state == owner) // live
                result = state
            else if(state == 1 && owner == 2) // dead black
                result = -1
            else if(state == 2 && owner == 1) // dead white
                result = -2
            else if(owner == 0 && state == 1) // unresolved black
                result = -3
            else if(owner == 0 && state == 2) // unresolved white
                result = -4

            switch(result) {
            case -1:
                text += '⬛'
                break
            case -2:
                text += '⬜'
                break
            case 1:
                text += '⚫'
                break
            case 2:
                text += '⚪'
                break
            case 0:
                text += '➕'
                break
            case -3:
                text += '🖤'
                break
            case -4:
                text += '🤍'
                break
            default:
                text += '❓'
            }
        }
        text += "\n"
    }

    $('#combined').text(text)
}

function get_owner(ownership, x, y) {
    if(ownership[y][x] > 0)
        return 1
    else
        return 2
}

function show_ownership(ownership, element) {
    var text = ''

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            var owner = get_owner(ownership, x, y) 
            if(owner == 1)
                text += '⚫'
            else
                text += '⚪'
        }
        text += "\n"
    }

    element.text(text)
}

//52240703
//49966513
function getBoard() {
    var urlParams = new URLSearchParams(window.location.search)
    var game = urlParams.get('game')
    $.ajax('https://api.allorigins.win/get?url=https://online-go.com/termination-api/game/'+game+'/state',
           {
               success: function(data, textStatus, jqXGR) {
                   board = $.parseJSON(data.contents).board
                   show()
               },
               error: failed
           }
          )
}

function getEstimate(player_to_move) {
    var data = {
        player_to_move: player_to_move,
        width: board[0].length,
        height: board.length,
        rules: 'aga',
        board_state: board
    }

    return $.ajax('https://ai.online-go.com/api/score',
           {
               type: 'post',
               data: JSON.stringify(data),
               contentType: 'application/json; charset=utf-8',
           }
          )
}

getBoard()
