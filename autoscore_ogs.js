// This version counts live stones on the boundary
// to determine the winner.

var board
var ownership_white
var ownership_black
var result_white
var result_black
var width
var height
var regions
var rules

function state_emoji(s) {
    switch(s) {
    case -1:
        return '⬛'
    case -2:
        return '⬜'
    case 1:
        return '⚫'
    case 2:
        return '⚪'
    case 0:
        return '➕'
    case -3:
        return '🖤'
    case -4:
        return '🤍'
    case -5:
        return '🔺'
    default:
        return '❓'
    }
}

function failed() {
    $('#algorithm').text('Failed')
}

function show(states, element) {
    var text = ''

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            text += state_emoji(states[y][x])
        }
        text += "\n"
    }
    element.text(text)
}

function getBoard_success() {
    width = board[0].length
    height = board.length

    show(board, $('#board'))

    ajax_white = getEstimate('white')
    ajax_black = getEstimate('black')

    $.when(ajax_white, ajax_black).done(function(ret_white, ret_black) {
        if(ret_white[1] != 'success' || ret_black[1] != 'success')
        {
            failed()
            return
        }

        ownership_white = ret_white[0].ownership
        ownership_black = ret_black[0].ownership
        result_white = ret_white[0].autoscored_board_state
        result_black = ret_black[0].autoscored_board_state
        show_results()
    })

}

function show_results() {
    show_result(result_white, $('#white'))
    show_result(result_black, $('#black'))
}

function get_owner(ownership, x, y) {
    if(ownership[y][x] > 0)
        return 1
    else
        return 2
}

function show_result(result, element) {
    var text = ''

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            var r = result[y][x]
            var state = board[y][x]

            if (r == 0)
            {
                if (state == 0)
                    state = -5;
                else
                    state = - state - 2;
            }
            else if (state != r)
            {
                state = -state;
            }

            text += state_emoji(state)
        }
        text += "\n"
    }

    element.text(text)
}

function getBoard() {
    var urlParams = new URLSearchParams(window.location.search)
    var game = urlParams.get('game')
    var board_string = urlParams.get('board')

    var rules = urlParams.get('rules')
    if (rules)
        $('[name=rules]').val(rules)

    if(game) {
        $('[name=game]').val(game)
        $.ajax('https://api.allorigins.win/get?url=https://online-go.com/termination-api/game/'+game+'/state',
           {
               success: function(data, textStatus, jqXGR) {
                   board = $.parseJSON(data.contents).board
                   $('[name=board]').val(JSON.stringify(board))
                   getBoard_success()
               },
               error: failed
           }
              )
    }
    else {
        $('[name=board]').val(board_string)
        board = $.parseJSON(board_string)
        getBoard_success()
    }
}

function getEstimate(player_to_move) {
    var data = {
        autoscore: true,
        player_to_move: player_to_move,
        width: board[0].length,
        height: board.length,
        rules: rules,
        board_state: board
    }

    return $.ajax('https://beta-ai.online-go.com/api/score',
           {
               type: 'post',
               data: JSON.stringify(data),
               contentType: 'application/json; charset=utf-8',
           }
          )
}

$(getBoard)
